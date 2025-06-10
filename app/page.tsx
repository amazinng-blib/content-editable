'use client';
import { useState } from 'react';
import { generateJobDescription } from './action/Job_details';
import { Editor, EditorState, ContentState } from 'draft-js';
import 'draft-js/dist/Draft.css';

// Add interface for API response
interface JobDescriptionResponse {
  success: boolean;
  content?: string;
  // error?: string;
  // missingFields?: Array<string>;
}

export default function Home() {
  const [jobDescription, setJobDescription] = useState(''); // Added missing state
  const [jobDescriptionEditorState, setJobDescriptionEditorState] = useState(
    EditorState.createEmpty()
  );
  const [loading, setLoading] = useState(false);
  const [editorState, setEditorState] = useState(
    EditorState.createWithContent(ContentState.createFromText(''))
  );

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const content = editorState.getCurrentContent().getPlainText();
      const response: JobDescriptionResponse = await generateJobDescription(
        content
      );

      if (response.success && response.content) {
        setJobDescription(response.content);
        setJobDescriptionEditorState(
          EditorState.createWithContent(
            ContentState.createFromText(response.content)
          )
        );
        setEditorState(
          EditorState.createWithContent(ContentState.createFromText(''))
        );
      } else {
        console.error('something went wrong');
      }
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
    // setQuery(newEditorState.getCurrentContent().getPlainText());
  };

  // Add missing handler for job description editor
  const handleJobDescriptionChange = (newEditorState: EditorState) => {
    setJobDescriptionEditorState(newEditorState);
    setJobDescription(newEditorState.getCurrentContent().getPlainText());
  };

  const handleFocusSearch = () => {
    setJobDescription('');
    setEditorState(
      EditorState.createWithContent(ContentState.createFromText(''))
    );
    setJobDescriptionEditorState(EditorState.createEmpty());
  };

  if (loading) {
    return <div className="max-w-[1200px] mx-auto py-12">Loading...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto py-12">
      {!jobDescription && (
        <div className="w-full border rounded-lg p-3">
          <Editor
            editorState={editorState}
            onChange={handleEditorChange}
            placeholder="Enter job description requirements..."
          />
        </div>
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
          Submit
        </button>
      )}

      {jobDescription && (
        <div className="my-8 mx-auto border-2 rounded-lg p-2">
          <Editor
            editorState={jobDescriptionEditorState}
            onChange={handleJobDescriptionChange}
            readOnly={false}
          />
        </div>
      )}
    </div>
  );
}
