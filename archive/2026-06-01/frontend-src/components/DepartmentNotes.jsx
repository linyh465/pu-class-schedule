import React, { useState } from 'react';
import notesData from '../data/notes_links.json';
import './DepartmentNotes.css';

export default function DepartmentNotes() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="header-notes-btn" onClick={() => setIsOpen(true)} title="檢視各系所選課注意事項">
        📄 注意事項
      </button>

      {isOpen && (
        <div className="notes-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="notes-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="notes-modal-header">
              <h2>115-1 各系選課注意事項</h2>
              <button className="notes-close-btn" onClick={() => setIsOpen(false)}>✖</button>
            </div>
            <div className="notes-modal-body">
              {Object.entries(notesData).map(([category, notes]) => (
                <div key={category} className="notes-category">
                  <h3 className="notes-category-title">{category}</h3>
                  <div className="notes-list">
                    {notes.map((note) => (
                      <a
                        key={note.name}
                        href={note.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="note-link"
                      >
                        {note.name}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
