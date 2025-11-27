/**
 * Changelog Viewer component for super admins.
 * Displays the current version and changelog entries.
 */
import { useState, useEffect } from 'react';
import { FileText, Package, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import packageJson from '../../package.json';

interface ChangelogEntry {
  version: string;
  date: string;
  sections: {
    [key: string]: string[];
  };
}

/**
 * Parses the changelog markdown content into structured data.
 */
function parseChangelog(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = content.split('\n');
  
  let currentEntry: ChangelogEntry | null = null;
  let currentSection: string | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match version header: ## [1.0.2] - 2025-11-27
    const versionMatch = line.match(/^##\s+\[([^\]]+)\]\s+-\s+(.+)$/);
    if (versionMatch) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = {
        version: versionMatch[1],
        date: versionMatch[2],
        sections: {},
      };
      currentSection = null;
      continue;
    }
    
    // Match section header: ### New Features, ### Added, ### Fixed, etc.
    const sectionMatch = line.match(/^###\s+(.+)$/);
    if (sectionMatch && currentEntry) {
      currentSection = sectionMatch[1];
      if (!currentEntry.sections[currentSection]) {
        currentEntry.sections[currentSection] = [];
      }
      continue;
    }
    
    // Match list item: - Item text
    const listItemMatch = line.match(/^-\s+(.+)$/);
    if (listItemMatch && currentEntry && currentSection) {
      currentEntry.sections[currentSection].push(listItemMatch[1]);
      continue;
    }
  }
  
  if (currentEntry) {
    entries.push(currentEntry);
  }
  
  return entries;
}

export function ChangelogViewer() {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadChangelog();
  }, []);

  /**
   * Loads the changelog from the markdown file.
   */
  async function loadChangelog() {
    try {
      setLoading(true);
      setError(null);
      
      // Import changelog as raw text using Vite's ?raw import
      const changelogModule = await import('../../CHANGELOG.md?raw');
      const content = changelogModule.default;
      
      const parsed = parseChangelog(content);
      
      // Sort versions in descending order (newest first)
      // Compare semantic versions (e.g., "1.0.2" > "1.0.1")
      const sorted = parsed.sort((a, b) => {
        const aParts = a.version.split('.').map(Number);
        const bParts = b.version.split('.').map(Number);
        
        // Compare major, minor, patch versions
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aPart = aParts[i] || 0;
          const bPart = bParts[i] || 0;
          if (aPart !== bPart) {
            return bPart - aPart; // Descending order
          }
        }
        return 0;
      });
      
      setChangelog(sorted);
      
      // Expand the latest version by default
      if (sorted.length > 0) {
        setExpandedVersions(new Set([sorted[0].version]));
      }
    } catch (err: any) {
      console.error('Error loading changelog:', err);
      setError(err.message || 'Failed to load changelog');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Toggles the expansion state of a version entry.
   */
  function toggleVersion(version: string) {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(version)) {
      newExpanded.delete(version);
    } else {
      newExpanded.add(version);
    }
    setExpandedVersions(newExpanded);
  }

  const currentVersion = packageJson.version;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ars-primary"></div>
          <span className="ml-3 text-gray-600">Loading changelog...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8">
        <div className="flex items-center gap-3 text-red-600">
          <FileText className="w-5 h-5" />
          <div>
            <p className="font-semibold">Error loading changelog</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Version Card */}
      <div className="bg-gradient-to-r from-ars-primary to-blue-600 rounded-xl border border-gray-200 shadow-sm p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 rounded-lg p-3">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium opacity-90">Current Version</p>
            <p className="text-2xl font-bold">{currentVersion}</p>
          </div>
        </div>
      </div>

      {/* Changelog Entries */}
      <div className="space-y-4">
        {changelog.map((entry) => {
          const isExpanded = expandedVersions.has(entry.version);
          const isLatest = changelog.indexOf(entry) === 0;
          
          return (
            <div
              key={entry.version}
              className={`bg-white rounded-xl border ${
                isLatest ? 'border-ars-primary shadow-md' : 'border-gray-200 shadow-sm'
              } overflow-hidden`}
            >
              {/* Version Header */}
              <button
                onClick={() => toggleVersion(entry.version)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                    <span className="text-lg font-bold text-ars-heading">
                      Version {entry.version}
                    </span>
                    {isLatest && (
                      <span className="px-2 py-0.5 bg-ars-primary text-white text-xs font-semibold rounded">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{entry.date}</span>
                  </div>
                </div>
              </button>

              {/* Version Content */}
              {isExpanded && (
                <div className="px-6 py-4 border-t border-gray-200 space-y-6">
                  {Object.entries(entry.sections).map(([sectionName, items]) => (
                    <div key={sectionName}>
                      <h4 className="text-sm font-semibold text-ars-heading mb-3 uppercase tracking-wide">
                        {sectionName}
                      </h4>
                      <ul className="space-y-2">
                        {items.map((item, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-ars-primary mt-1.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {changelog.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No changelog entries found.</p>
        </div>
      )}
    </div>
  );
}

