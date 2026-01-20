import { Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection } from 'prosemirror-state';
import { Column } from './Column';
import { ColumnSelection } from './ColumnSelection';
import { buildColumn, buildNColumns, buildColumnBlock, buildParagraph, findParentNodeClosestToPos } from './utils';

export const ColumnBlock = Node.create({
  name: 'columnBlock',
  group: 'block',
  content: 'column{2,}',
  isolating: true,
  selectable: true,

  addOptions() {
    return {
      nestedColumns: false,
      columnType: Column,
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.column-block',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(HTMLAttributes, { 
      class: 'column-block',
      'data-column-config': 'block'
    });
    return ['div', attrs, 0];
  },

  addCommands() {
    const unsetColumns =
      () =>
      ({ tr, dispatch }) => {
        try {
          if (!dispatch) {
            return;
          }

          // find the first ancestor
          const pos = tr.selection.$from;
          const where = ({ node }) => {
            if (!this.options.nestedColumns && node.type == this.type) {
              return true;
            }
            return node.type == this.type;
          };
          const firstAncestor = findParentNodeClosestToPos(pos, where);
          if (firstAncestor === undefined) {
            return;
          }

          // find the content inside of all the columns
          let nodes = [];
          firstAncestor.node.descendants((node, _, parent) => {
            if (parent?.type.name === Column.name) {
              nodes.push(node);
            }
          });
          nodes = nodes.reverse().filter((node) => node.content.size > 0);

          // resolve the position of the first ancestor
          const resolvedPos = tr.doc.resolve(firstAncestor.pos);
          const sel = new NodeSelection(resolvedPos);

          // insert the content inside of all the columns and remove the column layout
          tr = tr.setSelection(sel);
          nodes.forEach((node) => (tr = tr.insert(firstAncestor.pos, node)));
          tr = tr.deleteSelection();
          return dispatch(tr);
        } catch (error) {
          console.error(error);
        }
      };

    const setColumns =
      (n, keepContent = false) =>
      ({ tr, dispatch }) => {
        try {
          const { doc, selection } = tr;
          if (!dispatch) {
            console.log('no dispatch');
            return;
          }

          const sel = new ColumnSelection(selection);
          sel.expandSelection(doc);

          const { openStart, openEnd } = sel.content();
          if (openStart !== openEnd) {
            console.warn('failed depth check');
            return;
          }

          // create columns and put old content in the first column
          let columnBlock;
          if (keepContent) {
            const content = sel.content().toJSON();
            const firstColumn = buildColumn(content);
            const otherColumns = buildNColumns(n - 1);
            columnBlock = buildColumnBlock({
              content: [firstColumn, ...otherColumns],
            });
          } else {
            const columns = buildNColumns(n);
            columnBlock = buildColumnBlock({ content: columns });
          }
          const newNode = doc.type.schema.nodeFromJSON(columnBlock);
          if (newNode === null) {
            return;
          }

          const parent = sel.$anchor.parent.type;
          const canAcceptColumnBlockChild = (par) => {
            if (!par.contentMatch.matchType(this.type)) {
              return false;
            }

            if (!this.options.nestedColumns && par.name === Column.name) {
              return false;
            }

            return true;
          };
          if (!canAcceptColumnBlockChild(parent)) {
            console.warn('content not allowed');
            return;
          }

          tr = tr.setSelection(sel);
          tr = tr.replaceSelectionWith(newNode, false);
          return dispatch(tr);
        } catch (error) {
          console.error(error);
        }
      };

    const changeColumnCount =
      (n) =>
      ({ tr, dispatch, state }) => {
        try {
          if (!dispatch) {
            return false;
          }

          // Find the column block ancestor
          const pos = tr.selection.$from;
          const where = ({ node }) => node.type == this.type;
          let columnBlock;
          
          try {
            columnBlock = findParentNodeClosestToPos(pos, where);
          } catch (e) {
            console.log('Not inside a column block');
            return false;
          }

          // Collect all content from all existing columns
          const allColumnContents = [];
          columnBlock.node.forEach((child) => {
            if (child.type.name === Column.name) {
              const columnContent = [];
              child.forEach((contentNode) => {
                columnContent.push(contentNode.toJSON());
              });
              allColumnContents.push(columnContent);
            }
          });

          // Create new columns with the collected content
          const newColumns = [];
          for (let i = 0; i < n; i++) {
            if (i < allColumnContents.length && allColumnContents[i].length > 0) {
              // Use existing column content
              newColumns.push(buildColumn({ content: allColumnContents[i] }));
            } else {
              // Create empty column with a paragraph
              newColumns.push(buildColumn({ content: [buildParagraph({})] }));
            }
          }

          // If we have more columns of content than the new column count,
          // append the extra content to the last column
          if (allColumnContents.length > n) {
            const lastColumnContent = [...allColumnContents[n - 1]];
            for (let i = n; i < allColumnContents.length; i++) {
              lastColumnContent.push(...allColumnContents[i]);
            }
            newColumns[n - 1] = buildColumn({ content: lastColumnContent });
          }

          const newColumnBlock = buildColumnBlock({ content: newColumns });
          const newNode = state.schema.nodeFromJSON(newColumnBlock);
          
          if (!newNode) {
            return false;
          }

          // Replace the column block
          tr = tr.replaceRangeWith(
            columnBlock.pos,
            columnBlock.pos + columnBlock.node.nodeSize,
            newNode
          );

          return dispatch(tr);
        } catch (error) {
          console.error('Error changing column count:', error);
          return false;
        }
      };

    return {
      unsetColumns,
      setColumns,
      changeColumnCount,
    };
  },
});
