import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import Contract from '../../../models/Contract';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const query = {};

    // Build query filters
    const searchConditions = [];
    
    if (searchParams.get('category')) query.naicsCode = searchParams.get('category');
    
    if (searchParams.get('valueMin')) {
      const valueMin = Number(searchParams.get('valueMin'));
      if (!isNaN(valueMin)) {
        query['award.amount'] = { $gte: valueMin };
      }
    }
    
    // Handle setAside filter - check both new and legacy fields
    if (searchParams.get('setAside')) {
      const setAsideValue = searchParams.get('setAside');
      searchConditions.push({
        $or: [
          { typeOfSetAside: setAsideValue },
          { setAside: setAsideValue }
        ]
      });
    }
    
    if (searchParams.get('dateFrom')) {
      const dateFrom = new Date(searchParams.get('dateFrom'));
      if (!isNaN(dateFrom.getTime())) {
        query.postedDate = { $gte: dateFrom };
      }
    }
    
    // Handle search - add to search conditions array
    if (searchParams.get('search')) {
      const searchTerm = searchParams.get('search').trim();
      if (searchTerm) {
        searchConditions.push({
          $or: [
            { title: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } }
          ]
        });
      }
    }
    
    if (searchParams.get('state')) {
      query['placeOfPerformance.state.code'] = searchParams.get('state');
    }
    
    // Handle source filter - case insensitive match
    if (searchParams.get('source')) {
      const sourceValue = searchParams.get('source').toLowerCase();
      query.source = { $regex: new RegExp(`^${sourceValue}$`, 'i') };
    }
    
    // Combine search conditions with $and if multiple exist
    if (searchConditions.length > 0) {
      query.$and = searchConditions;
    }

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await Contract.countDocuments(query);

    // Fetch paginated data with optimized query
    const contracts = await Contract.find(query)
      .sort({ postedDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance

    return NextResponse.json({
      contracts,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle specific error types
    if (error.name === 'MongoServerError' || error.name === 'MongoError') {
      return NextResponse.json(
        { 
          error: 'Database error', 
          message: 'Unable to connect to database. Please try again later.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      );
    }
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          message: 'Invalid query parameters provided.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch contracts', 
        message: 'An unexpected error occurred. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}