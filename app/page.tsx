'use client';
import { useState } from 'react';
import { generateJobDescription } from './action/Job_details';

export default function Home() {
  const [query, setQuery] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const response = await generateJobDescription(query);

    if (response.success) {
      setJobDescription(response.content || '');
      setQuery('');
      setLoading(false);
    } else {
      console.error(response.error);
      setLoading(false);
      // optionally set error state here
    }
  };

  const handleFocusSearch = () => {
    setJobDescription('');
  };

  if (loading) {
    return <div className="max-w-[1200px] mx-auto py-12">Loading...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto py-12">
      {!jobDescription && (
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter job description requirements..."
          className="w-full p-3 border rounded-lg h-16 resize-vertical p-2"
        />
      )}

      {jobDescription ? (
        <button
          onClick={handleFocusSearch}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 cursor-pointer"
        >
          Search
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 cursor-pointer"
        >
          submit
        </button>
      )}

      {jobDescription && (
        <p className="my-8 mx-auto border-2 rounded-lg p-2">{jobDescription}</p>
      )}
    </div>
  );
}
