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
        '$order': 'registration_date DESC',
        '$where': 'registration_date > "2024-01-01T00:00:00.000"'
      }
    });

    const data = response.data;
    const opportunities = data.map(item => ({
      title: item.short_title || item.type_of_notice_description || 'Untitled',
      description: item.printout_1 || item.additional_description_1 || '',
      postedDate: item.registration_date ? new Date(item.registration_date) : null,
      dueDate: item.due_date ? new Date(item.due_date) : null,
      award: { amount: parseFloat(item.contract_amount) || 0 },
      link: item.epin ? `https://passport.cityofnewyork.us/page.aspx/en/ctr/contract_public?cn=${item.epin}` : '',
      source: 'ny',
      placeOfPerformance: { state: { code: 'NY' } },
    })).filter(item => item.title !== 'Untitled');

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