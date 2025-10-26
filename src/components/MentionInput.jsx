/**
 * MentionInput Component
 * Rich text input with @mention autocomplete functionality
 * Uses react-mentions library for mention detection and autocomplete
 */

import { useState, useEffect } from 'react';
import { Mention, MentionsInput } from 'react-mentions';
import { useTranslation } from 'react-i18next';

/**
 * Default styles for mentions input
 * Can be overridden via props
 */
const defaultMentionStyle = {
  control: {
    fontSize: 14,
    fontWeight: 'normal',
    minHeight: 40,
  },
  '&multiLine': {
    control: {
      fontFamily: 'inherit',
      minHeight: 80,
    },
    highlighter: {
      padding: 9,
      border: '1px solid transparent',
      boxSizing: 'border-box',
    },
    input: {
      padding: 9,
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      outline: 'none',
      fontSize: 14,
      boxSizing: 'border-box',
      lineHeight: '1.5',
    },
  },
  '&singleLine': {
    display: 'inline-block',
    width: '100%',
    highlighter: {
      padding: 9,
      border: '1px solid transparent',
      boxSizing: 'border-box',
    },
    input: {
      padding: 9,
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      outline: 'none',
      fontSize: 14,
      boxSizing: 'border-box',
    },
  },
  suggestions: {
    list: {
      backgroundColor: 'white',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: 14,
      maxHeight: 200,
      overflow: 'auto',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    },
    item: {
      padding: '8px 12px',
      borderBottom: '1px solid #f3f4f6',
      '&focused': {
        backgroundColor: '#f3f4f6',
      },
    },
  },
};

const defaultMentionHighlightStyle = {
  backgroundColor: '#dbeafe',
  color: '#1e40af',
  fontWeight: 500,
  borderRadius: '0.25rem',
  padding: '0 2px',
};

/**
 * MentionInput Component
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Change handler (value) => void
 * @param {Array} props.teamMembers - Array of team member objects {id, name, email, avatar_url}
 * @param {string} [props.placeholder] - Input placeholder text
 * @param {boolean} [props.multiLine=true] - Enable multi-line input
 * @param {number} [props.rows=3] - Number of rows for multi-line input
 * @param {Object} [props.style] - Custom styles
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.disabled=false] - Disable input
 * @param {Function} [props.onFocus] - Focus event handler
 * @param {Function} [props.onBlur] - Blur event handler
 */
export function MentionInput({
  value,
  onChange,
  teamMembers = [],
  placeholder,
  multiLine = true,
  rows = 3,
  style = {},
  className = '',
  disabled = false,
  onFocus,
  onBlur,
}) {
  const { t } = useTranslation('notifications');
  const [suggestions, setSuggestions] = useState([]);

  // Transform team members to mention suggestions format
  useEffect(() => {
    const formatted = teamMembers.map(member => ({
      id: member.id,
      display: member.full_name || member.email,
    }));
    setSuggestions(formatted);
  }, [teamMembers]);

  // Handle input change
  const handleChange = (event, newValue, newPlainTextValue, mentions) => {
    onChange(newValue);
  };

  // Merge custom styles with defaults
  const mergedStyle = {
    ...defaultMentionStyle,
    ...style,
  };

  return (
    <div className={`mention-input-wrapper ${className}`}>
      <MentionsInput
        value={value}
        onChange={handleChange}
        placeholder={placeholder || t('comments.placeholder')}
        style={mergedStyle}
        disabled={disabled}
        onFocus={onFocus}
        onBlur={onBlur}
        a11ySuggestionsListLabel={t('mentions.searchPlaceholder')}
        allowSpaceInQuery
        className={multiLine ? 'mentions-input-multiline' : 'mentions-input-singleline'}
      >
        <Mention
          trigger="@"
          data={suggestions}
          style={defaultMentionHighlightStyle}
          appendSpaceOnAdd
          displayTransform={(id, display) => `@${display}`}
          markup="@[__display__](__id__)"
          renderSuggestion={(suggestion, search, highlightedDisplay, index, focused) => (
            <div className={`mention-suggestion ${focused ? 'focused' : ''}`}>
              <span className="font-medium">{highlightedDisplay}</span>
            </div>
          )}
        />
      </MentionsInput>
    </div>
  );
}

export default MentionInput;
