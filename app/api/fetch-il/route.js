import { NextResponse } from 'next/server';
import axios from 'axios';
import connectDB from '../../../lib/db';
import Contract from '../../../models/Contract';

export async function GET() {
  await connectDB();
  try {
    const response = await axios.get('https://datacatalog.cookcountyil.gov/resource/qh8j-6k63.json', {
      params: {
        '$limit': 1000,
        '$order': 'start_date DESC',
        '$where': 'start_date > "2024-01-01T00:00:00.000"'
      }
    });

    const data = response.data;
    const opportunities = data.map(item => ({
      title: (typeof item.description === 'object' ? item.description.description : item.description) || item.category || 'Untitled',
      description: (typeof item.description === 'object' ? item.description.description : item.description) || '',
      postedDate: item.start_date ? new Date(item.start_date) : null,
      dueDate: item.end_date ? new Date(item.end_date) : null,
      award: { amount: parseFloat(item.amount) || 0 },
      link: item.contract_number ? `https://datacatalog.cookcountyil.gov/resource/qh8j-6k63?contract_number=${item.contract_number}` : '',
      source: 'il',
      placeOfPerformance: { state: { code: 'IL' } },
    })).filter(item => item.title !== 'Untitled');

    const ops = opportunities.map(item => ({
      updateOne: {
        filter: { title: item.title, source: 'il' },
        update: { $set: item },
        upsert: true,
      }
    }));
    const result = await Contract.bulkWrite(ops);

    return NextResponse.json({ message: 'IL data fetched', count: result.upsertedCount + result.modifiedCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}