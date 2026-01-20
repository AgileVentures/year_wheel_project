import { Selection, SelectionRange, TextSelection } from 'prosemirror-state';
import { Column } from './Column';
import { ColumnBlock } from './ColumnBlock';
import { findParentNodeClosestToPos } from './utils';

export class ColumnSelection extends Selection {
  constructor(selection) {
    const { $from, $to } = selection;
    super($from, $to);
    this._$from = $from;
    this._$to = $to;
  }

  _$from;
  _$to;

  get $from() {
    return this._$from;
  }

  get $to() {
    return this._$to;
  }

  map() {
    return this;
  }

  content() {
    return this.$from.doc.slice(this.from, this.to, true);
  }

  eq(other) {
    return other instanceof ColumnSelection && other.anchor == this.anchor;
  }

  toJSON() {
    return { type: 'column', from: this.from, to: this.to };
  }

  expandSelection(doc) {
    // find the first ancestor of the beginning of the selection
    const where = ({ pos, node }) => {
      if (node.type.name === Column.name) {
        return true;
      }
      return doc.resolve(pos).depth <= 0;
    };
    const { pos: fromPos } = findParentNodeClosestToPos(this.$from, where);
    this._$from = doc.resolve(fromPos);

    // find the first ancestor of the end of the selection
    const { pos: toPos, node: toNode } = findParentNodeClosestToPos(this.$to, where);
    this._$to = doc.resolve(toPos + toNode.nodeSize);

    if (this.getFirstNode()?.type.name === ColumnBlock.name) {
      const offset = 2;
      this._$from = doc.resolve(this.$from.pos + offset);
      this._$to = doc.resolve(this.$to.pos + offset);
    }

    const mutableThis = this;
    mutableThis.$anchor = this._$from;
    mutableThis.$head = this._$to;
    mutableThis.ranges = [new SelectionRange(this._$from, this._$to)];
  }

  static create(doc, from, to) {
    const $from = doc.resolve(from);
    const $to = doc.resolve(to);
    const selection = new TextSelection($from, $to);
    return new ColumnSelection(selection);
  }

  getFirstNode() {
    return this.content().content.firstChild;
  }
}
