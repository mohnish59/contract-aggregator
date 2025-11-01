import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import Contract from '../../../models/Contract';

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const query = {};
  
  if (searchParams.get('category')) query.naicsCode = searchParams.get('category');
  if (searchParams.get('valueMin')) query['award.amount'] = { $gte: Number(searchParams.get('valueMin')) };
  if (searchParams.get('setAside')) query.setAside = searchParams.get('setAside');
  if (searchParams.get('dateFrom')) query.postedDate = { $gte: new Date(searchParams.get('dateFrom')) };
  if (searchParams.get('search')) query.title = { $regex: searchParams.get('search'), $options: 'i' };
  if (searchParams.get('state')) query['placeOfPerformance.state.code'] = searchParams.get('state');  // New: Filter by state code (e.g., 'VA')

  const data = await Contract.find(query).sort({ postedDate: -1 }).limit(50);
  return NextResponse.json(data);
}