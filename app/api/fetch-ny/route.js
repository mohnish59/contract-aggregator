import { NextResponse } from 'next/server';
import axios from 'axios';
import connectDB from '../../../lib/db';
import Contract from '../../../models/Contract';

export async function GET() {
  await connectDB();
  try {
    const response = await axios.get('https://data.cityofnewyork.us/resource/i858-z32e.json', {
      params: {
        '$limit': 1000,
        '$order': 'start_date DESC'  // Recent first
      }
    });

    const data = response.data;
    const opportunities = data.map(item => ({
      title: item.contract_description,
      description: item.contract_purpose,
      postedDate: item.start_date ? new Date(item.start_date) : null,
      dueDate: item.end_date ? new Date(item.end_date) : null,
      award: { amount: item.contract_amount || 0 },
      link: item.contract_number ? `https://passport.cityofnewyork.us/page.aspx/en/ctr/contract_public?cn=${item.contract_number}` : '',
      source: 'ny',
      placeOfPerformance: { state: { code: 'NY' } },
    }));

    const ops = opportunities.map(item => ({
      updateOne: {
        filter: { title: item.title, source: 'ny' },
        update: { $set: item },
        upsert: true,
      }
    }));
    const result = await Contract.bulkWrite(ops);

    return NextResponse.json({ message: 'NY data fetched', count: result.upsertedCount + result.modifiedCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}