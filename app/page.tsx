'use client';
import { useState } from 'react';
import { generateJobDescription } from './action/Job_details';
import { Editor, EditorState, ContentState } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { generateTokenSuggestions } from './action/job_details_suggestions';
import { formatJobTemplateWithHighlights } from './utils/formatAPIResponse';
import htmlToDraft from 'html-to-draftjs';

// Add interface for API response
interface JobDescriptionResponse {
  success: boolean;
  content?: string;
}

export default function Home() {
  const [jobDescription, setJobDescription] = useState('');
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
        const tokenSuggestions = await generateTokenSuggestions(content);

        if (tokenSuggestions.success && tokenSuggestions.suggestions) {
          let finalJobDescription = await formatJobTemplateWithHighlights(
            response.content,
            tokenSuggestions.suggestions
          );

          setJobDescription(finalJobDescription);

          // Convert the HTML into Draft.js editor content
          const blocksFromHtml = htmlToDraft(finalJobDescription);
          const { contentBlocks, entityMap } = blocksFromHtml;

          const contentState = ContentState.createFromBlockArray(
            contentBlocks,
            entityMap
          );

          const editorState = EditorState.createWithContent(contentState);

          setJobDescriptionEditorState(editorState);

          // Clear the input editor
          setEditorState(
            EditorState.createWithContent(ContentState.createFromText(''))
          );
        }
      } else {
        console.error('Job description generation failed:', response);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleEditorChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
  };

  const handleJobDescriptionChange = (newEditorState: EditorState) => {
    setJobDescriptionEditorState(newEditorState);
    setJobDescription(newEditorState.getCurrentContent().getPlainText());
  };

  const handleFocusSearch = () => {
    console.log('Resetting form');
    setJobDescription('');
    setEditorState(
      EditorState.createWithContent(ContentState.createFromText(''))
    );
    setJobDescriptionEditorState(EditorState.createEmpty());
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto py-12 text-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full xl:max-w-[1200px] mx-auto py-12 px-4">
      {!jobDescription && (
        <div className="w-full border rounded-lg p-3 mb-4">
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
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 cursor-pointer mb-4"
        >
          Create New Job Description
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Generating...' : 'Submit'}
        </button>
      )}

      {jobDescription && (
        <div className="my-8 mx-auto  p-4">
          <h3 className="text-lg font-semibold mb-4">
            Generated Job Description:
          </h3>
          <div className="min-h-[400px]">
            <Editor
              editorState={jobDescriptionEditorState}
              onChange={handleJobDescriptionChange}
              readOnly={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
