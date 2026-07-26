import { useState } from 'react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { api } from '@/lib/api';

interface BonusPanelProps {
  notebookId: string | null;
  onClose: () => void;
}

export default function BonusPanel({ notebookId, onClose }: BonusPanelProps) {
  const [activeTab, setActiveTab] = useState<'roadmap' | 'podcast'>('roadmap');
  
  const [roadmap, setRoadmap] = useState<string>('');
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  const [podcastScript, setPodcastScript] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);

  const handleGenerateRoadmap = async () => {
    if (!notebookId) return;
    setIsGeneratingRoadmap(true);
    setRoadmap('');
    try {
      const result = await api.bonus.generateRoadmap(notebookId);
      setRoadmap(result);
      toast.success('Roadmap generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate roadmap');
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleGeneratePodcast = async () => {
    if (!notebookId) return;
    setIsGeneratingPodcast(true);
    setPodcastScript('');
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    try {
      const { script, audioBase64 } = await api.bonus.generatePodcast(notebookId);
      setPodcastScript(script);
      if (audioBase64) {
        // Convert base64 to Blob URL
        const byteCharacters = atob(audioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mp3' });
        setAudioUrl(URL.createObjectURL(blob));
        toast.success('Podcast generated!');
      } else {
        toast.success('Podcast script generated! (Audio skipped, check API keys)');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate podcast');
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  if (!notebookId) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="font-semibold text-gray-800">Bonus Features</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded p-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'roadmap' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('roadmap')}
        >
          YouTube Roadmap
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'podcast' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('podcast')}
        >
          Podcast (TTS)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
        {activeTab === 'roadmap' && (
          <div className="flex flex-col h-full">
            <p className="text-sm text-gray-600 mb-4">
              Generate a learning roadmap based on all YouTube videos in this notebook. The AI will organize topics and provide deep links to specific timestamps.
            </p>
            <button
              onClick={handleGenerateRoadmap}
              disabled={isGeneratingRoadmap}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors mb-6"
            >
              {isGeneratingRoadmap ? 'Generating Roadmap...' : 'Generate Roadmap'}
            </button>

            {roadmap && (
              <div className="prose prose-sm max-w-none text-gray-800 flex-1">
                <ReactMarkdown>{roadmap}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {activeTab === 'podcast' && (
          <div className="flex flex-col h-full">
            <p className="text-sm text-gray-600 mb-4">
              Generate a short 1-minute podcast summarizing all sources in this notebook.
            </p>
            <button
              onClick={handleGeneratePodcast}
              disabled={isGeneratingPodcast}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors mb-6"
            >
              {isGeneratingPodcast ? 'Generating Podcast...' : 'Generate Podcast'}
            </button>

            {audioUrl && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg flex flex-col items-center shadow-inner">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Listen to Podcast</p>
                <audio controls src={audioUrl} className="w-full max-w-xs" />
              </div>
            )}

            {podcastScript && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Podcast Script</h3>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap font-serif leading-relaxed">
                  {podcastScript}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
