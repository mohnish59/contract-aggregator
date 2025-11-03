import { NextResponse } from 'next/server';
import axios from 'axios';
import connectDB from '../../../lib/db';
import Contract from '../../../models/Contract';

export async function GET() {
  try {
    await connectDB();
    
    // Calculate date range (90 days back from today)
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 30); // Don't mutate original date
    
    // Format dates as MM/DD/YYYY for SAM.gov API
    const formatDateForAPI = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };
    
    const postedFrom = formatDateForAPI(fromDate);
    const postedTo = formatDateForAPI(today);

    const API_KEY = process.env.SAM_API_KEY;
    
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Configuration error', message: 'SAM_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }
    const MAX_LIMIT = 1000;
    let offset = 0;
    let allContracts = [];
    let totalFetched = 0;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 100; // Safety limit to prevent infinite loops
    const RATE_LIMIT_DELAY = 200; // 200ms delay between requests (reduced from 12s)

    // Fetch all pages
    while (hasMore && pageCount < maxPages) {
      try {
        const response = await axios.get('https://api.sam.gov/opportunities/v2/search', {
          params: {
            api_key: API_KEY,
            postedFrom,
            postedTo,
            limit: MAX_LIMIT,
            offset: offset,
            status: 'active', // Added: Filter to open/active only
          },
          timeout: 30000,
        });

        if (!response.data || !response.data.opportunitiesData) {
          console.warn('Unexpected API response:', response.data);
          break;
        }

        const data = response.data.opportunitiesData;
        const totalRecords = response.data.totalRecords || 0; // Use metadata if available
        
        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        allContracts = allContracts.concat(data);
        totalFetched += data.length;
        offset += data.length;
        pageCount++;

        // Stop if we've fetched all records or got less than the limit (last page)
        if (totalRecords > 0 && offset >= totalRecords) {
          hasMore = false;
        } else if (data.length < MAX_LIMIT) {
          hasMore = false;
        }

        // Log progress every 5 pages
        if (pageCount % 5 === 0) {
          console.log(`Fetched ${totalFetched} contracts across ${pageCount} pages...`);
        }

        // Small delay to respect rate limits
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      } catch (pageError) {
        console.error(`Error on page ${pageCount + 1} (offset ${offset}):`, pageError.message);
        if (process.env.NODE_ENV === 'development') {
          console.error('Full stack:', pageError.stack);
        }
        if (pageError.response?.status === 429 || pageError.response?.status >= 500) {
          console.warn('Rate limited or server error - stopping');
          break;
        }
        throw pageError;
      }
    }

    if (allContracts.length === 0) {
      return NextResponse.json({ 
        message: 'No contracts found',
        totalFetched: 0,
        pages: 0
      });
    }

    // Process with all fields, filtering out null entries
    const ops = allContracts
      .map(item => {
      let postedDate = null;
      let dueDate = null;
      
      try {
        if (item.postedDate) {
          postedDate = new Date(item.postedDate);
          if (isNaN(postedDate.getTime())) postedDate = null;
        }
        if (item.dueDate || item.responseDeadline) {
          dueDate = new Date(item.dueDate || item.responseDeadline);
          if (isNaN(dueDate.getTime())) dueDate = null;
        }
      } catch (e) {
        console.warn('Date error for noticeId:', item.noticeId);
      }

      let link = null;
      if (item.noticeId) {
        link = `https://sam.gov/opp/${item.noticeId}/view`;
      } else if (item.href || item.url) {
        link = item.href || item.url;
      }

      // Ensure we have a unique identifier
      const noticeId = item.noticeId || null;
      if (!noticeId && !item.title) {
        console.warn('Skipping item without noticeId or title:', item);
        return null; // Skip items without identifier
      }

      return {
        updateOne: {
          filter: { noticeId: noticeId || item.title },
          update: {
            $set: {
              noticeId: noticeId || item.title,
              title: item.title || 'Untitled',
              description: item.description || item.summary || item.objective || '',
              postedDate: postedDate,
              dueDate: dueDate,
              type: item.type || item.opportunityType || '',
              setAside: item.setAsideCode || item.setAside || '',
              naicsCode: item.naicsCode || item.naics || '',
              award: { 
                amount: (() => {
                  const amount = item.award?.amount || item.awardAmount || item.totalValue || 0;
                  const parsed = parseFloat(amount);
                  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
                })()
              },
              placeOfPerformance: { 
                state: { 
                  code: item.placeOfPerformance?.state?.code || 
                        item.stateCode || 
                        item.state?.code || 
                        '' 
                } 
              },
              link: link,
              source: 'federal',
            }
          },
          upsert: true,
        }
      };
      })
      .filter(op => op !== null); // Remove null entries

    // Batch write with better error tracking
    const batchSize = 500;
    let totalUpserted = 0;
    let totalModified = 0;
    const errors = [];

    for (let i = 0; i < ops.length; i += batchSize) {
      const batch = ops.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      try {
        const result = await Contract.bulkWrite(batch, { ordered: false });
        totalUpserted += result.upsertedCount || 0;
        totalModified += result.modifiedCount || 0;
        console.log(`Batch ${batchNumber} processed: ${result.upsertedCount} upserted, ${result.modifiedCount} modified`);
      } catch (batchError) {
        const errorDetails = {
          batch: batchNumber,
          message: batchError.message,
          writtenErrors: batchError.writeErrors?.length || 0,
        };
        console.error(`Batch ${batchNumber} error:`, errorDetails);
        errors.push(`Batch ${batchNumber}: ${batchError.message}${batchError.writeErrors ? ` (${batchError.writeErrors.length} failed writes)` : ''}`);
      }
    }

    return NextResponse.json({
      message: 'Data fetched successfully',
      totalFetched: totalFetched,
      totalUpserted: totalUpserted,
      totalModified: totalModified,
      totalProcessed: totalUpserted + totalModified,
      pages: pageCount,
      dateRange: { from: postedFrom, to: postedTo },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Fetch error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('Full stack:', error.stack);
    }
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.statusText || 
                        error.message || 
                        'Unknown error';
    
    const statusCode = error.response?.status || 500;

    return NextResponse.json(
      { 
        error: 'Fetch failed', 
        message: errorMessage,
      },
      { status: statusCode }
    );
  }
}