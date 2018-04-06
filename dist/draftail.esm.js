import PropTypes from 'prop-types';
import React, { Component, PureComponent } from 'react';
import { AtomicBlockUtils, CompositeDecorator, DefaultDraftBlockRenderMap, DefaultDraftInlineStyle, Editor, EditorState, KeyBindingUtil, Modifier, RichUtils, SelectionState, convertFromRaw, convertToRaw, getDefaultKeyBinding } from 'draft-js';
import { ListNestingStyles, blockDepthStyleFn } from 'draftjs-conductor';
import isSoftNewlineEvent from 'draft-js/lib/isSoftNewlineEvent';
import { filterEditorState } from 'draftjs-filters';

// See https://github.com/facebook/draft-js/blob/master/src/model/immutable/DefaultDraftBlockRenderMap.js
var BLOCK_TYPE = {
    // This is used to represent a normal text block (paragraph).
    UNSTYLED: 'unstyled',
    HEADER_ONE: 'header-one',
    HEADER_TWO: 'header-two',
    HEADER_THREE: 'header-three',
    HEADER_FOUR: 'header-four',
    HEADER_FIVE: 'header-five',
    HEADER_SIX: 'header-six',
    UNORDERED_LIST_ITEM: 'unordered-list-item',
    ORDERED_LIST_ITEM: 'ordered-list-item',
    BLOCKQUOTE: 'blockquote',
    CODE: 'code-block',
    // This represents a "custom" block, not for rich text, with arbitrary content.
    ATOMIC: 'atomic'
};

var ENTITY_TYPE = {
    LINK: 'LINK',
    IMAGE: 'IMAGE',
    HORIZONTAL_RULE: 'HORIZONTAL_RULE'
};

// See https://github.com/facebook/draft-js/blob/master/src/model/immutable/DefaultDraftInlineStyle.js
var INLINE_STYLE = {
    BOLD: 'BOLD',
    ITALIC: 'ITALIC',
    CODE: 'CODE',
    UNDERLINE: 'UNDERLINE',
    STRIKETHROUGH: 'STRIKETHROUGH',
    MARK: 'MARK',
    QUOTATION: 'QUOTATION',
    SMALL: 'SMALL',
    SAMPLE: 'SAMPLE',
    INSERT: 'INSERT',
    DELETE: 'DELETE',
    KEYBOARD: 'KEYBOARD',
    SUPERSCRIPT: 'SUPERSCRIPT',
    SUBSCRIPT: 'SUBSCRIPT'
};

var BLOCK_TYPES = Object.values(BLOCK_TYPE);
var ENTITY_TYPES = Object.values(ENTITY_TYPE);
var INLINE_STYLES = Object.values(INLINE_STYLE);

var FONT_FAMILY_MONOSPACE = 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, sans-serif';

// See https://github.com/facebook/draft-js/blob/master/src/model/immutable/DefaultDraftInlineStyle.js
var CUSTOM_STYLE_MAP = {};
CUSTOM_STYLE_MAP[INLINE_STYLE.BOLD] = DefaultDraftInlineStyle[INLINE_STYLE.BOLD];
CUSTOM_STYLE_MAP[INLINE_STYLE.ITALIC] = DefaultDraftInlineStyle[INLINE_STYLE.ITALIC];
CUSTOM_STYLE_MAP[INLINE_STYLE.STRIKETHROUGH] = DefaultDraftInlineStyle[INLINE_STYLE.STRIKETHROUGH];
CUSTOM_STYLE_MAP[INLINE_STYLE.UNDERLINE] = DefaultDraftInlineStyle[INLINE_STYLE.UNDERLINE];

CUSTOM_STYLE_MAP[INLINE_STYLE.CODE] = {
    padding: '0.2em 0.3125em',
    margin: '0',
    fontSize: '85%',
    backgroundColor: 'rgba(27, 31, 35, 0.05)',
    fontFamily: FONT_FAMILY_MONOSPACE,
    borderRadius: '3px'
};

CUSTOM_STYLE_MAP[INLINE_STYLE.MARK] = {
    backgroundColor: 'yellow'
};
CUSTOM_STYLE_MAP[INLINE_STYLE.QUOTATION] = {
    fontStyle: 'italic'
};
CUSTOM_STYLE_MAP[INLINE_STYLE.SMALL] = {
    fontSize: 'smaller'
};
CUSTOM_STYLE_MAP[INLINE_STYLE.SAMPLE] = {
    fontFamily: FONT_FAMILY_MONOSPACE
};
CUSTOM_STYLE_MAP[INLINE_STYLE.INSERT] = {
    textDecoration: 'underline'
};
CUSTOM_STYLE_MAP[INLINE_STYLE.DELETE] = {
    textDecoration: 'line-through'
};
CUSTOM_STYLE_MAP[INLINE_STYLE.KEYBOARD] = {
    fontFamily: FONT_FAMILY_MONOSPACE,
    padding: '3px 5px',
    fontSize: '11px',
    lineHeight: '10px',
    color: '#444d56',
    verticalAlign: 'middle',
    backgroundColor: '#fafbfc',
    border: 'solid 1px #c6cbd1',
    borderBottomColor: '#959da5',
    borderRadius: '3px',
    boxShadow: 'inset 0 -1px 0 #959da5'
};
CUSTOM_STYLE_MAP[INLINE_STYLE.SUPERSCRIPT] = {
    fontSize: '80%',
    verticalAlign: 'super',
    lineHeight: '1'
};
CUSTOM_STYLE_MAP[INLINE_STYLE.SUBSCRIPT] = {
    fontSize: '80%',
    verticalAlign: 'sub',
    lineHeight: '1'
};

var BR_TYPE = 'BR';

var UNDO_TYPE = 'undo';
var REDO_TYPE = 'redo';

// Originally from https://github.com/facebook/draft-js/blob/master/src/component/utils/getDefaultKeyBinding.js.
var KEY_CODES = {
    K: 75,
    B: 66,
    U: 85,
    J: 74,
    I: 73,
    X: 88,
    0: 48,
    1: 49,
    2: 50,
    3: 51,
    4: 52,
    5: 53,
    6: 54,
    7: 55,
    8: 56,
    '.': 190,
    ',': 188
};

var INPUT_BLOCK_MAP = {
    '* ': BLOCK_TYPE.UNORDERED_LIST_ITEM,
    '- ': BLOCK_TYPE.UNORDERED_LIST_ITEM,
    '1. ': BLOCK_TYPE.ORDERED_LIST_ITEM,
    '# ': BLOCK_TYPE.HEADER_ONE,
    '## ': BLOCK_TYPE.HEADER_TWO,
    '### ': BLOCK_TYPE.HEADER_THREE,
    '#### ': BLOCK_TYPE.HEADER_FOUR,
    '##### ': BLOCK_TYPE.HEADER_FIVE,
    '###### ': BLOCK_TYPE.HEADER_SIX,
    '> ': BLOCK_TYPE.BLOCKQUOTE,
    // It makes more sense not to require a space here.
    // This matches how Dropbox Paper operates.
    '```': BLOCK_TYPE.CODE
};

var INPUT_ENTITY_MAP = {};

INPUT_ENTITY_MAP[ENTITY_TYPE.HORIZONTAL_RULE] = '---';

var LABELS = {};

LABELS[BLOCK_TYPE.UNSTYLED] = 'P';
LABELS[BLOCK_TYPE.HEADER_ONE] = 'H1';
LABELS[BLOCK_TYPE.HEADER_TWO] = 'H2';
LABELS[BLOCK_TYPE.HEADER_THREE] = 'H3';
LABELS[BLOCK_TYPE.HEADER_FOUR] = 'H4';
LABELS[BLOCK_TYPE.HEADER_FIVE] = 'H5';
LABELS[BLOCK_TYPE.HEADER_SIX] = 'H6';
LABELS[BLOCK_TYPE.UNORDERED_LIST_ITEM] = 'UL';
LABELS[BLOCK_TYPE.ORDERED_LIST_ITEM] = 'OL';
LABELS[BLOCK_TYPE.CODE] = '{ }';
LABELS[BLOCK_TYPE.BLOCKQUOTE] = '❝';

LABELS[INLINE_STYLE.BOLD] = 'B';
LABELS[INLINE_STYLE.ITALIC] = '𝘐';
LABELS[INLINE_STYLE.CODE] = '{ }';
LABELS[INLINE_STYLE.UNDERLINE] = 'U';
LABELS[INLINE_STYLE.STRIKETHROUGH] = 'S';
LABELS[INLINE_STYLE.MARK] = '☆';
LABELS[INLINE_STYLE.QUOTATION] = '❛';
LABELS[INLINE_STYLE.SMALL] = '𝖲𝗆a𝗅𝗅';
LABELS[INLINE_STYLE.SAMPLE] = '𝙳𝚊𝚝𝚊';
LABELS[INLINE_STYLE.INSERT] = 'Ins';
LABELS[INLINE_STYLE.DELETE] = 'Del';
LABELS[INLINE_STYLE.SUPERSCRIPT] = 'Sup';
LABELS[INLINE_STYLE.SUBSCRIPT] = 'Sub';
LABELS[INLINE_STYLE.KEYBOARD] = '⌘';

LABELS[ENTITY_TYPE.LINK] = '🔗';
LABELS[ENTITY_TYPE.IMAGE] = '🖼';
LABELS[ENTITY_TYPE.HORIZONTAL_RULE] = '―';
LABELS[BR_TYPE] = '↵';

LABELS[UNDO_TYPE] = '↺';
LABELS[REDO_TYPE] = '↻';

var DESCRIPTIONS = {};

DESCRIPTIONS[BLOCK_TYPE.UNSTYLED] = 'Paragraph';
DESCRIPTIONS[BLOCK_TYPE.HEADER_ONE] = 'Heading 1';
DESCRIPTIONS[BLOCK_TYPE.HEADER_TWO] = 'Heading 2';
DESCRIPTIONS[BLOCK_TYPE.HEADER_THREE] = 'Heading 3';
DESCRIPTIONS[BLOCK_TYPE.HEADER_FOUR] = 'Heading 4';
DESCRIPTIONS[BLOCK_TYPE.HEADER_FIVE] = 'Heading 5';
DESCRIPTIONS[BLOCK_TYPE.HEADER_SIX] = 'Heading 6';
DESCRIPTIONS[BLOCK_TYPE.UNORDERED_LIST_ITEM] = 'Bulleted list';
DESCRIPTIONS[BLOCK_TYPE.ORDERED_LIST_ITEM] = 'Numbered list';
DESCRIPTIONS[BLOCK_TYPE.BLOCKQUOTE] = 'Blockquote';
DESCRIPTIONS[BLOCK_TYPE.CODE] = 'Code block';

DESCRIPTIONS[INLINE_STYLE.BOLD] = 'Bold';
DESCRIPTIONS[INLINE_STYLE.ITALIC] = 'Italic';
DESCRIPTIONS[INLINE_STYLE.CODE] = 'Code';
DESCRIPTIONS[INLINE_STYLE.UNDERLINE] = 'Underline';
DESCRIPTIONS[INLINE_STYLE.STRIKETHROUGH] = 'Strikethrough';
DESCRIPTIONS[INLINE_STYLE.MARK] = 'Highlight';
DESCRIPTIONS[INLINE_STYLE.QUOTATION] = 'Inline quotation';
DESCRIPTIONS[INLINE_STYLE.SMALL] = 'Small';
DESCRIPTIONS[INLINE_STYLE.SAMPLE] = 'Program output';
DESCRIPTIONS[INLINE_STYLE.INSERT] = 'Inserted';
DESCRIPTIONS[INLINE_STYLE.DELETE] = 'Deleted';
DESCRIPTIONS[INLINE_STYLE.KEYBOARD] = 'Shortcut key';
DESCRIPTIONS[INLINE_STYLE.SUPERSCRIPT] = 'Superscript';
DESCRIPTIONS[INLINE_STYLE.SUBSCRIPT] = 'Subscript';

DESCRIPTIONS[ENTITY_TYPE.LINK] = 'Link';
DESCRIPTIONS[ENTITY_TYPE.IMAGE] = 'Image';
DESCRIPTIONS[ENTITY_TYPE.HORIZONTAL_RULE] = 'Horizontal line';

DESCRIPTIONS[BR_TYPE] = 'Line break';

DESCRIPTIONS[UNDO_TYPE] = 'Undo';
DESCRIPTIONS[REDO_TYPE] = 'Redo';

var KEYBOARD_SHORTCUTS = {};

KEYBOARD_SHORTCUTS[BLOCK_TYPE.UNSTYLED] = '⌫';
KEYBOARD_SHORTCUTS[BLOCK_TYPE.HEADER_ONE] = '#';
KEYBOARD_SHORTCUTS[BLOCK_TYPE.HEADER_TWO] = '##';
KEYBOARD_SHORTCUTS[BLOCK_TYPE.HEADER_THREE] = '###';
KEYBOARD_SHORTCUTS[BLOCK_TYPE.HEADER_FOUR] = '####';
KEYBOARD_SHORTCUTS[BLOCK_TYPE.HEADER_FIVE] = '#####';
KEYBOARD_SHORTCUTS[BLOCK_TYPE.HEADER_SIX] = '######';
KEYBOARD_SHORTCUTS[BLOCK_TYPE.UNORDERED_LIST_ITEM] = '-';
KEYBOARD_SHORTCUTS[BLOCK_TYPE.ORDERED_LIST_ITEM] = '1.';
KEYBOARD_SHORTCUTS[BLOCK_TYPE.BLOCKQUOTE] = '>';
KEYBOARD_SHORTCUTS[BLOCK_TYPE.CODE] = '```';

KEYBOARD_SHORTCUTS[INLINE_STYLE.BOLD] = { other: 'Ctrl + B', macOS: '⌘ + B' };
KEYBOARD_SHORTCUTS[INLINE_STYLE.ITALIC] = { other: 'Ctrl + I', macOS: '⌘ + I' };
KEYBOARD_SHORTCUTS[INLINE_STYLE.UNDERLINE] = {
    other: 'Ctrl + U',
    macOS: '⌘ + U'
};
KEYBOARD_SHORTCUTS[INLINE_STYLE.STRIKETHROUGH] = {
    other: 'Ctrl + ⇧ + X',
    macOS: '⌘ + ⇧ + X'
};
KEYBOARD_SHORTCUTS[INLINE_STYLE.SUPERSCRIPT] = {
    other: 'Ctrl + .',
    macOS: '⌘ + .'
};
KEYBOARD_SHORTCUTS[INLINE_STYLE.SUBSCRIPT] = {
    other: 'Ctrl + ,',
    macOS: '⌘ + ,'
};

KEYBOARD_SHORTCUTS[ENTITY_TYPE.LINK] = { other: 'Ctrl + K', macOS: '⌘ + K' };

KEYBOARD_SHORTCUTS[BR_TYPE] = '⇧ + ↵';
KEYBOARD_SHORTCUTS[ENTITY_TYPE.HORIZONTAL_RULE] = '- - -';

KEYBOARD_SHORTCUTS[UNDO_TYPE] = { other: 'Ctrl + Z', macOS: '⌘ + Z' };
KEYBOARD_SHORTCUTS[REDO_TYPE] = { other: 'Ctrl + ⇧ + Z', macOS: '⌘ + ⇧ + Z' };

var HANDLED = 'handled';
var NOT_HANDLED = 'not-handled';

/**
 * Inspired by draftjs-utils, with our custom functions.
 *
 * DraftUtils functions are utility helpers useful in isolation, specific to the Draft.js API,
 * without ties to Draftail's specific behavior or other APIs.
 */
var DraftUtils = {
    /**
     * Returns the first selected block.
     */
    getSelectedBlock: function getSelectedBlock(editorState) {
        var selection = editorState.getSelection();
        var content = editorState.getCurrentContent();

        return content.getBlockMap().get(selection.getStartKey());
    },


    /**
     * Returns the entity applicable to whole of current selection.
     * An entity can not span multiple blocks.
     * https://github.com/jpuri/draftjs-utils/blob/e81c0ae19c3b0fdef7e0c1b70d924398956be126/js/inline.js#L75
     */
    getSelectionEntity: function getSelectionEntity(editorState) {
        var entity = void 0;
        var selection = editorState.getSelection();
        var start = selection.getStartOffset();
        var end = selection.getEndOffset();
        if (start === end && start === 0) {
            end = 1;
        } else if (start === end) {
            start -= 1;
        }
        var block = this.getSelectedBlock(editorState);

        for (var i = start; i < end; i += 1) {
            var currentEntity = block.getEntityAt(i);
            if (!currentEntity) {
                entity = undefined;
                break;
            }
            if (i === start) {
                entity = currentEntity;
            } else if (entity !== currentEntity) {
                entity = undefined;
                break;
            }
        }
        return entity;
    },


    /**
     * Creates a selection on a given entity in the currently selected block.
     */
    getEntitySelection: function getEntitySelection(editorState, entityKey) {
        var selectionState = editorState.getSelection();
        var block = this.getSelectedBlock(editorState);
        var entityRange = void 0;
        // https://github.com/jpuri/draftjs-utils/blob/e81c0ae19c3b0fdef7e0c1b70d924398956be126/js/inline.js#L111
        block.findEntityRanges(function (value) {
            return value.get('entity') === entityKey;
        }, function (start, end) {
            entityRange = {
                start: start,
                end: end
            };
        });

        return selectionState.merge({
            anchorOffset: entityRange.start,
            focusOffset: entityRange.end
        });
    },


    /**
     * Updates a given atomic block's entity, merging new data with the old one.
     */
    updateBlockEntity: function updateBlockEntity(editorState, block, data) {
        var content = editorState.getCurrentContent();
        var nextContent = content.mergeEntityData(block.getEntityAt(0), data);

        // To remove in Draft.js 0.11.
        // This is necessary because entity data is still using a mutable, global store.
        nextContent = Modifier.mergeBlockData(nextContent, new SelectionState({
            anchorKey: block.getKey(),
            anchorOffset: 0,
            focusKey: block.getKey(),
            focusOffset: block.getLength()
        }), {});

        return EditorState.push(editorState, nextContent, 'apply-entity');
    },


    /**
     * Inserts a horizontal rule in the place of the current selection.
     * Returns updated EditorState.
     * Inspired by DraftUtils.addLineBreakRemovingSelection.
     */
    addHorizontalRuleRemovingSelection: function addHorizontalRuleRemovingSelection(editorState) {
        var contentState = editorState.getCurrentContent();
        var contentStateWithEntity = contentState.createEntity(ENTITY_TYPE.HORIZONTAL_RULE, 'IMMUTABLE', {});
        var entityKey = contentStateWithEntity.getLastCreatedEntityKey();

        return AtomicBlockUtils.insertAtomicBlock(editorState, entityKey, ' ');
    },


    /**
     * Changes a block type to be `newType`, setting its new text.
     * Also removes the required characters from the characterList,
     * and resets block data.
     */
    resetBlockWithType: function resetBlockWithType(editorState, newType, newText) {
        var contentState = editorState.getCurrentContent();
        var selectionState = editorState.getSelection();
        var key = selectionState.getStartKey();
        var blockMap = contentState.getBlockMap();
        var block = blockMap.get(key);

        // Maintain persistence in the list while removing chars from the start.
        // https://github.com/facebook/draft-js/blob/788595984da7c1e00d1071ea82b063ff87140be4/src/model/transaction/removeRangeFromContentState.js#L333
        var chars = block.getCharacterList();
        var startOffset = 0;
        var sliceOffset = block.getText().length - newText.length;
        while (startOffset < sliceOffset) {
            chars = chars.shift();
            startOffset++;
        }

        var newBlock = block.merge({
            type: newType,
            text: newText,
            characterList: chars,
            data: {}
        });
        var newContentState = contentState.merge({
            blockMap: blockMap.set(key, newBlock)
        });
        var newSelectionState = selectionState.merge({
            anchorOffset: 0,
            focusOffset: 0
        });

        return EditorState.acceptSelection(EditorState.set(editorState, {
            currentContent: newContentState
        }), newSelectionState);
    },


    /**
     * Removes the block at the given key.
     */
    removeBlock: function removeBlock(editorState, key) {
        var content = editorState.getCurrentContent();
        var blockMap = content.getBlockMap().remove(key);

        return EditorState.set(editorState, {
            currentContent: content.merge({
                blockMap: blockMap
            })
        });
    },


    /**
     * Removes a block-level entity, turning the block into an empty paragraph,
     * and placing the selection on it.
     */
    removeBlockEntity: function removeBlockEntity(editorState, entityKey, blockKey) {
        var newState = editorState;

        var content = editorState.getCurrentContent();
        var blockMap = content.getBlockMap();
        var block = blockMap.get(blockKey);

        var newBlock = block.merge({
            type: BLOCK_TYPE.UNSTYLED,
            text: '',
            // No text = no character list
            characterList: block.getCharacterList().slice(0, 0),
            data: {}
        });

        var newSelection = new SelectionState({
            anchorKey: blockKey,
            focusKey: blockKey,
            anchorOffset: 0,
            focusOffset: 0
        });

        var newContent = content.merge({
            blockMap: blockMap.set(blockKey, newBlock)
        });

        newState = EditorState.push(newState, newContent, 'change-block-type');
        newState = EditorState.forceSelection(newState, newSelection);

        return newState;
    },


    /**
     * Handles pressing delete within an atomic block. This can happen when selection is placed on an image.
     * Ideally this should be handled by the built-in RichUtils, but it's not.
     * See https://github.com/wagtail/wagtail/issues/4370.
     */
    handleDeleteAtomic: function handleDeleteAtomic(editorState) {
        var selection = editorState.getSelection();
        var content = editorState.getCurrentContent();
        var key = selection.getAnchorKey();
        var offset = selection.getAnchorOffset();
        var block = content.getBlockForKey(key);

        // Problematic selection. Pressing delete here would remove the entity, but not the block.
        if (selection.isCollapsed() && block.getType() === BLOCK_TYPE.ATOMIC && offset === 0) {
            return this.removeBlockEntity(editorState, block.getEntityAt(0), key);
        }

        return false;
    },


    /**
     * Get an entity decorator strategy based on the given entity type.
     * This strategy will find all entities of the given type.
     */
    getEntityTypeStrategy: function getEntityTypeStrategy(entityType) {
        var strategy = function strategy(contentBlock, callback, contentState) {
            contentBlock.findEntityRanges(function (character) {
                var entityKey = character.getEntity();
                return entityKey !== null && contentState.getEntity(entityKey).getType() === entityType;
            }, callback);
        };

        return strategy;
    },


    /**
     * Determines whether the editor should show its placeholder.
     * See https://draftjs.org/docs/api-reference-editor.html#placeholder
     * for details on why this is useful.
     */
    shouldHidePlaceholder: function shouldHidePlaceholder(editorState) {
        var contentState = editorState.getCurrentContent();
        return contentState.hasText() || contentState.getBlockMap().first().getType() !== BLOCK_TYPE.UNSTYLED;
    },


    /**
     * Inserts new unstyled block.
     * Initially inspired from https://github.com/jpuri/draftjs-utils/blob/e81c0ae19c3b0fdef7e0c1b70d924398956be126/js/block.js#L153,
     * but changed so that the split + block type reset amounts to
     * only one change in the undo stack.
     */
    insertNewUnstyledBlock: function insertNewUnstyledBlock(editorState) {
        var selection = editorState.getSelection();
        var newContent = Modifier.splitBlock(editorState.getCurrentContent(), selection);
        var blockMap = newContent.getBlockMap();
        var blockKey = selection.getStartKey();
        var insertedBlockKey = newContent.getKeyAfter(blockKey);

        var newBlock = blockMap.get(insertedBlockKey).set('type', BLOCK_TYPE.UNSTYLED);

        newContent = newContent.merge({
            blockMap: blockMap.set(insertedBlockKey, newBlock)
        });

        return EditorState.push(editorState, newContent, 'split-block');
    },


    /**
     * Handles Shift + Enter keypress removing selection and inserting a line break.
     * https://github.com/jpuri/draftjs-utils/blob/112bbe449cc9156522fcf2b40f2910a071b795c2/js/block.js#L133
     */
    addLineBreak: function addLineBreak(editorState) {
        var content = editorState.getCurrentContent();
        var selection = editorState.getSelection();

        if (selection.isCollapsed()) {
            return RichUtils.insertSoftNewline(editorState);
        }

        var newContent = Modifier.removeRange(content, selection, 'forward');
        var fragment = newContent.getSelectionAfter();
        var block = newContent.getBlockForKey(fragment.getStartKey());
        newContent = Modifier.insertText(newContent, fragment, '\n', block.getInlineStyleAt(fragment.getStartOffset()), null);
        return EditorState.push(editorState, newContent, 'insert-fragment');
    },


    /**
     * Handles hard newlines.
     * https://github.com/jpuri/draftjs-utils/blob/e81c0ae19c3b0fdef7e0c1b70d924398956be126/js/keyPress.js#L17
     */
    handleHardNewline: function handleHardNewline(editorState) {
        var selection = editorState.getSelection();

        if (!selection.isCollapsed()) {
            return false;
        }

        var content = editorState.getCurrentContent();
        var blockKey = selection.getStartKey();
        var block = content.getBlockForKey(blockKey);
        var blockType = block.getType();
        var isListBlock = [BLOCK_TYPE.UNORDERED_LIST_ITEM, BLOCK_TYPE.ORDERED_LIST_ITEM].includes(blockType);

        if (!isListBlock && block.getType() !== BLOCK_TYPE.UNSTYLED && block.getLength() === selection.getStartOffset()) {
            return this.insertNewUnstyledBlock(editorState);
        } else if (isListBlock && block.getLength() === 0) {
            var depth = block.getDepth();

            if (depth === 0) {
                return EditorState.push(editorState, RichUtils.tryToRemoveBlockStyle(editorState), 'change-block-type');
            }

            var blockMap = content.getBlockMap();
            var newBlock = block.set('depth', depth - 1);

            return EditorState.push(editorState, content.merge({
                blockMap: blockMap.set(blockKey, newBlock)
            }), 'adjust-depth');
        }

        return false;
    },


    /**
     * Handles three scenarios:
     * - Soft newlines.
     * - Hard newlines in the "defer breaking out of the block" case.
     * - Other hard newlines.
     * See https://github.com/springload/draftail/issues/104,
     * https://github.com/jpuri/draftjs-utils/issues/10.
     */
    handleNewLine: function handleNewLine(editorState, event) {
        // https://github.com/jpuri/draftjs-utils/blob/e81c0ae19c3b0fdef7e0c1b70d924398956be126/js/keyPress.js#L64
        if (isSoftNewlineEvent(event)) {
            return this.addLineBreak(editorState);
        }

        var content = editorState.getCurrentContent();
        var selection = editorState.getSelection();
        var key = selection.getStartKey();
        var offset = selection.getStartOffset();
        var block = content.getBlockForKey(key);

        var isDeferredBreakoutBlock = [BLOCK_TYPE.CODE].includes(block.getType());

        if (isDeferredBreakoutBlock) {
            var isEmpty = selection.isCollapsed() && offset === 0 && block.getLength() === 0;

            if (isEmpty) {
                return EditorState.push(editorState, Modifier.setBlockType(content, selection, BLOCK_TYPE.UNSTYLED), 'change-block-type');
            }

            return false;
        }

        return this.handleHardNewline(editorState);
    }
};

var hasCommandModifier = KeyBindingUtil.hasCommandModifier;
var isOptionKeyCommand = KeyBindingUtil.isOptionKeyCommand;

var hasCmd = hasCommandModifier;

// Hack relying on the internals of Draft.js.
// See https://github.com/facebook/draft-js/pull/869
var IS_MAC_OS = isOptionKeyCommand({ altKey: 'test' }) === 'test';

/**
 * Methods defining the behavior of the editor, depending on its configuration.
 */
var behavior = {
    /**
     * Configure block render map from block types list.
     */
    getBlockRenderMap: function getBlockRenderMap(blockTypes) {
        var renderMap = DefaultDraftBlockRenderMap;

        // Override default element for code block.
        // Fix https://github.com/facebook/draft-js/issues/406.
        if (blockTypes.some(function (block) {
            return block.type === BLOCK_TYPE.CODE;
        })) {
            renderMap = renderMap.set(BLOCK_TYPE.CODE, {
                element: 'code',
                wrapper: DefaultDraftBlockRenderMap.get(BLOCK_TYPE.CODE).wrapper
            });
        }

        blockTypes.filter(function (block) {
            return block.element;
        }).forEach(function (block) {
            renderMap = renderMap.set(block.type, {
                element: block.element
            });
        });

        return renderMap;
    },


    /**
     * block style function automatically adding a class with the block's type.
     */
    blockStyleFn: function blockStyleFn(block) {
        var type = block.getType();

        return 'Draftail-block--' + type + ' ' + blockDepthStyleFn(block);
    },


    /**
     * Configure key binding function from enabled blocks, styles, entities.
     */
    getKeyBindingFn: function getKeyBindingFn(blockTypes, inlineStyles, entityTypes) {
        var getEnabled = function getEnabled(activeTypes) {
            return activeTypes.reduce(function (enabled, type) {
                enabled[type.type] = type.type;
                return enabled;
            }, {});
        };

        var blocks = getEnabled(blockTypes);
        var styles = getEnabled(inlineStyles);
        var entities = getEnabled(entityTypes);

        // Emits key commands to use in `handleKeyCommand` in `Editor`.
        var keyBindingFn = function keyBindingFn(e) {
            // Safeguard that we only trigger shortcuts with exact matches.
            // eg. cmd + shift + b should not trigger bold.
            if (e.shiftKey) {
                // Key bindings supported by Draft.js must be explicitely discarded.
                // See https://github.com/facebook/draft-js/issues/941.
                switch (e.keyCode) {
                    case KEY_CODES.B:
                        return undefined;
                    case KEY_CODES.I:
                        return undefined;
                    case KEY_CODES.J:
                        return undefined;
                    case KEY_CODES.U:
                        return undefined;
                    case KEY_CODES.X:
                        return hasCmd(e) && styles[INLINE_STYLE.STRIKETHROUGH];
                    case KEY_CODES[7]:
                        return hasCmd(e) && blocks[BLOCK_TYPE.ORDERED_LIST_ITEM];
                    case KEY_CODES[8]:
                        return hasCmd(e) && blocks[BLOCK_TYPE.UNORDERED_LIST_ITEM];
                    default:
                        return getDefaultKeyBinding(e);
                }
            }

            var ctrlAlt = (e.ctrlKey || e.metaKey) && e.altKey;

            switch (e.keyCode) {
                case KEY_CODES.K:
                    return hasCmd(e) && entities.LINK;
                case KEY_CODES.B:
                    return hasCmd(e) && styles[INLINE_STYLE.BOLD];
                case KEY_CODES.I:
                    return hasCmd(e) && styles[INLINE_STYLE.ITALIC];
                case KEY_CODES.J:
                    return hasCmd(e) && styles[INLINE_STYLE.CODE];
                case KEY_CODES.U:
                    return hasCmd(e) && styles[INLINE_STYLE.UNDERLINE];
                case KEY_CODES['.']:
                    return hasCmd(e) && styles[INLINE_STYLE.SUPERSCRIPT];
                case KEY_CODES[',']:
                    return hasCmd(e) && styles[INLINE_STYLE.SUBSCRIPT];
                case KEY_CODES[0]:
                    // Reverting to unstyled block is always available.
                    return ctrlAlt && BLOCK_TYPE.UNSTYLED;
                case KEY_CODES[1]:
                    return ctrlAlt && blocks[BLOCK_TYPE.HEADER_ONE];
                case KEY_CODES[2]:
                    return ctrlAlt && blocks[BLOCK_TYPE.HEADER_TWO];
                case KEY_CODES[3]:
                    return ctrlAlt && blocks[BLOCK_TYPE.HEADER_THREE];
                case KEY_CODES[4]:
                    return ctrlAlt && blocks[BLOCK_TYPE.HEADER_FOUR];
                case KEY_CODES[5]:
                    return ctrlAlt && blocks[BLOCK_TYPE.HEADER_FIVE];
                case KEY_CODES[6]:
                    return ctrlAlt && blocks[BLOCK_TYPE.HEADER_SIX];
                default:
                    return getDefaultKeyBinding(e);
            }
        };

        return keyBindingFn;
    },
    hasKeyboardShortcut: function hasKeyboardShortcut(type) {
        return !!KEYBOARD_SHORTCUTS[type];
    },
    getKeyboardShortcut: function getKeyboardShortcut(type) {
        var isMacOS = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : IS_MAC_OS;

        var shortcut = KEYBOARD_SHORTCUTS[type];
        var system = isMacOS ? 'macOS' : 'other';

        return shortcut && shortcut[system] || shortcut;
    },


    /**
     * Defines whether a block should be altered to a new type when
     * the user types a given mark.
     * This powers the "autolist" feature.
     *
     * Returns the new block type, or false if no replacement should occur.
     */
    handleBeforeInputBlockType: function handleBeforeInputBlockType(mark, blockTypes) {
        return blockTypes.find(function (b) {
            return b.type === INPUT_BLOCK_MAP[mark];
        }) ? INPUT_BLOCK_MAP[mark] : false;
    },
    handleBeforeInputHR: function handleBeforeInputHR(mark, block) {
        return mark === INPUT_ENTITY_MAP[ENTITY_TYPE.HORIZONTAL_RULE] && block.getType() !== BLOCK_TYPE.CODE;
    },
    getCustomStyleMap: function getCustomStyleMap(inlineStyles) {
        var customStyleMap = {};

        inlineStyles.forEach(function (style) {
            if (style.style) {
                customStyleMap[style.type] = style.style;
            } else if (CUSTOM_STYLE_MAP[style.type]) {
                customStyleMap[style.type] = CUSTOM_STYLE_MAP[style.type];
            } else {
                customStyleMap[style.type] = {};
            }
        });

        return customStyleMap;
    },


    /**
     * Applies whitelist and blacklist operations to the editor content,
     * so the resulting editor state is shaped according to Draftail
     * expectations and configuration.
     */
    filterPaste: function filterPaste(_ref, editorState) {
        var maxListNesting = _ref.maxListNesting,
            enableHorizontalRule = _ref.enableHorizontalRule,
            enableLineBreak = _ref.enableLineBreak,
            blockTypes = _ref.blockTypes,
            inlineStyles = _ref.inlineStyles,
            entityTypes = _ref.entityTypes;

        var enabledEntityTypes = entityTypes.slice();
        var whitespacedCharacters = ['\t', '📷'];

        if (enableHorizontalRule) {
            enabledEntityTypes.push({
                type: ENTITY_TYPE.HORIZONTAL_RULE
            });
        }

        if (!enableLineBreak) {
            whitespacedCharacters.push('\n');
        }

        return filterEditorState({
            blocks: blockTypes.map(function (b) {
                return b.type;
            }),
            styles: inlineStyles.map(function (s) {
                return s.type;
            }),
            entities: enabledEntityTypes,
            maxNesting: maxListNesting,
            whitespacedCharacters: whitespacedCharacters
        }, editorState);
    }
};

var EMPTY_CONTENT_STATE = null;

var conversion = {
    // RawDraftContentState + decorators => EditorState.
    createEditorState: function createEditorState(rawContentState, decorators) {
        var compositeDecorator = new CompositeDecorator(decorators);
        var editorState = void 0;

        if (rawContentState) {
            var contentState = convertFromRaw(rawContentState);
            editorState = EditorState.createWithContent(contentState, compositeDecorator);
        } else {
            editorState = EditorState.createEmpty(compositeDecorator);
        }

        return editorState;
    },


    // EditorState => RawDraftContentState.
    serialiseEditorState: function serialiseEditorState(editorState) {
        var contentState = editorState.getCurrentContent();
        var rawContentState = convertToRaw(contentState);

        var isEmpty = rawContentState.blocks.every(function (block) {
            return block.text.trim().length === 0 && block.entityRanges.length === 0 && block.inlineStyleRanges.length === 0;
        });

        return isEmpty ? EMPTY_CONTENT_STATE : rawContentState;
    }
};

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();







var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};



var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

/**
 * Wraps a component to provide it with additional props based on context.
 */
var getComponentWrapper = function getComponentWrapper(Wrapped, wrapperProps) {
  var Wrapper = function Wrapper(props) {
    return React.createElement(Wrapped, _extends({}, props, wrapperProps));
  };

  return Wrapper;
};

/**
 * Icon as SVG element. Can optionally render a React element instead.
 */
var Icon = function Icon(_ref) {
    var icon = _ref.icon,
        title = _ref.title,
        className = _ref.className;

    var isPathOrRef = typeof icon === 'string';
    var children = void 0;

    if (isPathOrRef) {
        if (icon.includes('#')) {
            children = React.createElement('use', { xlinkHref: icon });
        } else {
            children = React.createElement('path', { d: icon });
        }
    } else if (Array.isArray(icon)) {
        // eslint-disable-next-line springload/react/no-array-index-key
        children = icon.map(function (d, i) {
            return React.createElement('path', { key: i, d: d });
        });
    } else {
        return icon;
    }

    return React.createElement(
        'svg',
        {
            width: '16',
            height: '16',
            viewBox: '0 0 1024 1024',
            className: 'Draftail-Icon ' + (className || ''),
            'aria-hidden': title ? null : true,
            role: title ? 'img' : null,
            'aria-label': title || null
        },
        children
    );
};

process.env.NODE_ENV !== "production" ? Icon.propTypes = {
    // The icon definition is very flexible.
    icon: PropTypes.oneOfType([
    // String icon = SVG path or symbol reference.
    PropTypes.string,
    // List of SVG paths.
    PropTypes.arrayOf(PropTypes.string),
    // Arbitrary React element.
    PropTypes.node]).isRequired,
    title: PropTypes.string,
    className: PropTypes.string
} : void 0;

Icon.defaultProps = {
    title: null,
    className: null
};

/**
 * Displays a basic button, with optional active variant,
 * enriched with a tooltip. The tooltip stops showing on click.
 */

var ToolbarButton = function (_PureComponent) {
    inherits(ToolbarButton, _PureComponent);

    function ToolbarButton(props) {
        classCallCheck(this, ToolbarButton);

        var _this = possibleConstructorReturn(this, (ToolbarButton.__proto__ || Object.getPrototypeOf(ToolbarButton)).call(this, props));

        _this.state = {
            showTooltipOnHover: true
        };

        _this.onMouseDown = _this.onMouseDown.bind(_this);
        _this.onMouseLeave = _this.onMouseLeave.bind(_this);
        return _this;
    }

    createClass(ToolbarButton, [{
        key: 'onMouseDown',
        value: function onMouseDown(e) {
            var _props = this.props,
                name = _props.name,
                onClick = _props.onClick;


            e.preventDefault();

            this.setState({
                showTooltipOnHover: false
            });

            onClick(name);
        }
    }, {
        key: 'onMouseLeave',
        value: function onMouseLeave() {
            this.setState({
                showTooltipOnHover: true
            });
        }
    }, {
        key: 'render',
        value: function render() {
            var _props2 = this.props,
                name = _props2.name,
                active = _props2.active,
                label = _props2.label,
                title = _props2.title,
                icon = _props2.icon;
            var showTooltipOnHover = this.state.showTooltipOnHover;


            return React.createElement(
                'button',
                {
                    name: name,
                    className: 'Draftail-ToolbarButton' + (active ? ' Draftail-ToolbarButton--active' : ''),
                    type: 'button',
                    'aria-label': title || null,
                    'data-draftail-balloon': title && showTooltipOnHover ? true : null,
                    tabIndex: -1,
                    onMouseDown: this.onMouseDown,
                    onMouseLeave: this.onMouseLeave
                },
                icon ? React.createElement(Icon, { icon: icon }) : null,
                label ? React.createElement(
                    'span',
                    { className: 'Draftail-ToolbarButton__label' },
                    label
                ) : null
            );
        }
    }]);
    return ToolbarButton;
}(PureComponent);

process.env.NODE_ENV !== "production" ? ToolbarButton.propTypes = {
    name: PropTypes.string,
    active: PropTypes.bool,
    label: PropTypes.string,
    title: PropTypes.string,
    icon: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.node]),
    onClick: PropTypes.func
} : void 0;

ToolbarButton.defaultProps = {
    name: null,
    active: false,
    label: null,
    title: null,
    icon: null,
    onClick: function onClick() {}
};

var ToolbarGroup = function ToolbarGroup(_ref) {
    var children = _ref.children;

    var hasChildren = React.Children.toArray(children).some(function (c) {
        return c !== null;
    });
    return hasChildren ? React.createElement(
        'div',
        { className: 'Draftail-ToolbarGroup' },
        children
    ) : null;
};

process.env.NODE_ENV !== "production" ? ToolbarGroup.propTypes = {
    children: PropTypes.node
} : void 0;

ToolbarGroup.defaultProps = {
    children: null
};

var getButtonLabel = function getButtonLabel(type, icon) {
    var label = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : icon ? null : LABELS[type];
    return label;
};

var getButtonTitle = function getButtonTitle(type) {
    var description = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DESCRIPTIONS[type];

    var hasShortcut = behavior.hasKeyboardShortcut(type);
    var title = description;

    if (hasShortcut) {
        var desc = description ? description + '\n' : '';
        title = '' + desc + behavior.getKeyboardShortcut(type);
    }

    return title;
};

// eslint-disable-next-line springload/react/prefer-stateless-function

var ToolbarDefaults = function (_PureComponent) {
    inherits(ToolbarDefaults, _PureComponent);

    function ToolbarDefaults() {
        classCallCheck(this, ToolbarDefaults);
        return possibleConstructorReturn(this, (ToolbarDefaults.__proto__ || Object.getPrototypeOf(ToolbarDefaults)).apply(this, arguments));
    }

    createClass(ToolbarDefaults, [{
        key: 'render',
        value: function render() {
            var _props = this.props,
                currentStyles = _props.currentStyles,
                currentBlock = _props.currentBlock,
                blockTypes = _props.blockTypes,
                inlineStyles = _props.inlineStyles,
                enableHorizontalRule = _props.enableHorizontalRule,
                enableLineBreak = _props.enableLineBreak,
                showUndoControl = _props.showUndoControl,
                showRedoControl = _props.showRedoControl,
                entityTypes = _props.entityTypes,
                toggleBlockType = _props.toggleBlockType,
                toggleInlineStyle = _props.toggleInlineStyle,
                addHR = _props.addHR,
                addBR = _props.addBR,
                onUndoRedo = _props.onUndoRedo,
                onRequestSource = _props.onRequestSource;

            return [React.createElement(
                ToolbarGroup,
                { key: 'styles' },
                inlineStyles.map(function (t) {
                    return React.createElement(ToolbarButton, {
                        key: t.type,
                        name: t.type,
                        active: currentStyles.has(t.type),
                        label: getButtonLabel(t.type, t.icon, t.label),
                        title: getButtonTitle(t.type, t.description),
                        icon: t.icon,
                        onClick: toggleInlineStyle
                    });
                })
            ), React.createElement(
                ToolbarGroup,
                { key: 'blocks' },
                blockTypes.map(function (t) {
                    return React.createElement(ToolbarButton, {
                        key: t.type,
                        name: t.type,
                        active: currentBlock === t.type,
                        label: getButtonLabel(t.type, t.icon, t.label),
                        title: getButtonTitle(t.type, t.description),
                        icon: t.icon,
                        onClick: toggleBlockType
                    });
                })
            ), React.createElement(
                ToolbarGroup,
                { key: 'hr-br' },
                enableHorizontalRule ? React.createElement(ToolbarButton, {
                    name: ENTITY_TYPE.HORIZONTAL_RULE,
                    onClick: addHR,
                    label: getButtonLabel(ENTITY_TYPE.HORIZONTAL_RULE, enableHorizontalRule.icon, enableHorizontalRule.label),
                    title: getButtonTitle(ENTITY_TYPE.HORIZONTAL_RULE, enableHorizontalRule.description),
                    icon: enableHorizontalRule.icon
                }) : null,
                enableLineBreak ? React.createElement(ToolbarButton, {
                    name: BR_TYPE,
                    onClick: addBR,
                    label: getButtonLabel(BR_TYPE, enableLineBreak.icon, enableLineBreak.label),
                    title: getButtonTitle(BR_TYPE, enableLineBreak.description),
                    icon: enableLineBreak.icon
                }) : null
            ), React.createElement(
                ToolbarGroup,
                { key: 'entities' },
                entityTypes.map(function (t) {
                    return React.createElement(ToolbarButton, {
                        key: t.type,
                        name: t.type,
                        onClick: onRequestSource,
                        label: getButtonLabel(t.type, t.icon, t.label),
                        title: getButtonTitle(t.type, t.description),
                        icon: t.icon
                    });
                })
            ), React.createElement(
                ToolbarGroup,
                { key: 'undo-redo' },
                showUndoControl ? React.createElement(ToolbarButton, {
                    name: UNDO_TYPE,
                    onClick: onUndoRedo,
                    label: getButtonLabel(UNDO_TYPE, showUndoControl.icon, showUndoControl.label),
                    title: getButtonTitle(UNDO_TYPE, showUndoControl.description)
                }) : null,
                showRedoControl ? React.createElement(ToolbarButton, {
                    name: REDO_TYPE,
                    onClick: onUndoRedo,
                    label: getButtonLabel(REDO_TYPE, showRedoControl.icon, showRedoControl.label),
                    title: getButtonTitle(REDO_TYPE, showRedoControl.description)
                }) : null
            )];
        }
    }]);
    return ToolbarDefaults;
}(PureComponent);

process.env.NODE_ENV !== "production" ? ToolbarDefaults.propTypes = {
    currentStyles: PropTypes.object.isRequired,
    currentBlock: PropTypes.string.isRequired,
    enableHorizontalRule: PropTypes.oneOfType([PropTypes.bool, PropTypes.shape({
        // Describes the control in the editor UI, concisely.
        label: PropTypes.string,
        // Describes the control in the editor UI.
        description: PropTypes.string,
        // Represents the control in the editor UI.
        icon: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.node])
    })]).isRequired,
    enableLineBreak: PropTypes.oneOfType([PropTypes.bool, PropTypes.shape({
        // Describes the control in the editor UI, concisely.
        label: PropTypes.string,
        // Describes the control in the editor UI.
        description: PropTypes.string,
        // Represents the control in the editor UI.
        icon: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.node])
    })]).isRequired,
    showUndoControl: PropTypes.oneOfType([PropTypes.bool, PropTypes.shape({
        // Describes the control in the editor UI, concisely.
        label: PropTypes.string,
        // Describes the control in the editor UI.
        description: PropTypes.string,
        // Represents the control in the editor UI.
        icon: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.node])
    })]).isRequired,
    showRedoControl: PropTypes.oneOfType([PropTypes.bool, PropTypes.shape({
        // Describes the control in the editor UI, concisely.
        label: PropTypes.string,
        // Describes the control in the editor UI.
        description: PropTypes.string,
        // Represents the control in the editor UI.
        icon: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.node])
    })]).isRequired,
    entityTypes: PropTypes.array.isRequired,
    blockTypes: PropTypes.array.isRequired,
    inlineStyles: PropTypes.array.isRequired,
    toggleBlockType: PropTypes.func.isRequired,
    toggleInlineStyle: PropTypes.func.isRequired,
    addHR: PropTypes.func.isRequired,
    addBR: PropTypes.func.isRequired,
    onUndoRedo: PropTypes.func.isRequired,
    onRequestSource: PropTypes.func.isRequired
} : void 0;

var Toolbar = function Toolbar(props) {
    var controls = props.controls,
        getEditorState = props.getEditorState,
        onChange = props.onChange;

    return React.createElement(
        'div',
        { className: 'Draftail-Toolbar', role: 'toolbar' },
        React.createElement(ToolbarDefaults, props),
        React.createElement(
            ToolbarGroup,
            null,
            controls.map(function (Control, i) {
                return React.createElement(Control
                // eslint-disable-next-line springload/react/no-array-index-key
                , { key: i,
                    getEditorState: getEditorState,
                    onChange: onChange
                });
            })
        )
    );
};

process.env.NODE_ENV !== "production" ? Toolbar.propTypes = {
    controls: PropTypes.array.isRequired,
    getEditorState: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired
} : void 0;

/**
 * An <hr/> in the editor.
 */
var DividerBlock = function DividerBlock() {
  return React.createElement("hr", { className: "Draftail-DividerBlock" });
};

/**
 * Main component of the Draftail editor.
 * Contains the Draft.js editor instance, and ties together UI and behavior.
 */

var DraftailEditor = function (_Component) {
    inherits(DraftailEditor, _Component);

    function DraftailEditor(props) {
        classCallCheck(this, DraftailEditor);

        var _this = possibleConstructorReturn(this, (DraftailEditor.__proto__ || Object.getPrototypeOf(DraftailEditor)).call(this, props));

        _this.onChange = _this.onChange.bind(_this);
        _this.saveState = _this.saveState.bind(_this);
        _this.getEditorState = _this.getEditorState.bind(_this);

        _this.toggleSource = _this.toggleSource.bind(_this);
        _this.toggleEditor = _this.toggleEditor.bind(_this);
        _this.lockEditor = _this.toggleEditor.bind(_this, true);
        _this.unlockEditor = _this.toggleEditor.bind(_this, false);

        _this.handleReturn = _this.handleReturn.bind(_this);
        _this.onFocus = _this.onFocus.bind(_this);
        _this.onBlur = _this.onBlur.bind(_this);
        _this.onTab = _this.onTab.bind(_this);
        _this.handleKeyCommand = _this.handleKeyCommand.bind(_this);
        _this.handleBeforeInput = _this.handleBeforeInput.bind(_this);

        _this.toggleBlockType = _this.toggleBlockType.bind(_this);
        _this.toggleInlineStyle = _this.toggleInlineStyle.bind(_this);

        _this.onEditEntity = _this.onEditEntity.bind(_this);
        _this.onRemoveEntity = _this.onRemoveEntity.bind(_this);

        _this.addHR = _this.addHR.bind(_this);
        _this.addBR = _this.addBR.bind(_this);
        _this.onUndoRedo = _this.onUndoRedo.bind(_this);

        _this.blockRenderer = _this.blockRenderer.bind(_this);
        _this.onRequestSource = _this.onRequestSource.bind(_this);
        _this.onCompleteSource = _this.onCompleteSource.bind(_this);
        _this.onCloseSource = _this.onCloseSource.bind(_this);

        _this.focus = _this.focus.bind(_this);

        _this.renderSource = _this.renderSource.bind(_this);

        var rawContentState = props.rawContentState,
            decorators = props.decorators,
            entityTypes = props.entityTypes;


        var entityDecorators = entityTypes.filter(function (type) {
            return !!type.decorator;
        }).map(function (type) {
            return {
                strategy: DraftUtils.getEntityTypeStrategy(type.type),
                component: getComponentWrapper(type.decorator, {
                    onEdit: _this.onEditEntity,
                    onRemove: _this.onRemoveEntity
                })
            };
        });

        _this.state = {
            editorState: conversion.createEditorState(rawContentState, decorators.concat(entityDecorators)),
            hasFocus: false,
            readOnly: false,
            sourceOptions: null
        };
        return _this;
    }

    createClass(DraftailEditor, [{
        key: 'onChange',
        value: function onChange(nextState) {
            var _this2 = this;

            var _props = this.props,
                stateSaveInterval = _props.stateSaveInterval,
                maxListNesting = _props.maxListNesting,
                enableHorizontalRule = _props.enableHorizontalRule,
                enableLineBreak = _props.enableLineBreak,
                blockTypes = _props.blockTypes,
                inlineStyles = _props.inlineStyles,
                inlineStylesExtra = _props.inlineStylesExtra,
                entityTypes = _props.entityTypes;
            var editorState = this.state.editorState;

            var shouldFilterPaste = nextState.getCurrentContent() !== editorState.getCurrentContent() && nextState.getLastChangeType() === 'insert-fragment';
            var filteredState = nextState;

            if (shouldFilterPaste) {
                filteredState = behavior.filterPaste({
                    maxListNesting: maxListNesting,
                    enableHorizontalRule: enableHorizontalRule,
                    enableLineBreak: enableLineBreak,
                    blockTypes: blockTypes,
                    inlineStyles: inlineStyles.concat(inlineStylesExtra),
                    entityTypes: entityTypes
                }, filteredState);
            }

            this.setState({
                editorState: filteredState
            }, function () {
                window.clearTimeout(_this2.updateTimeout);
                _this2.updateTimeout = window.setTimeout(_this2.saveState, stateSaveInterval);
            });
        }
    }, {
        key: 'saveState',
        value: function saveState() {
            var onSave = this.props.onSave;
            var editorState = this.state.editorState;


            onSave(conversion.serialiseEditorState(editorState));
        }
    }, {
        key: 'getEditorState',
        value: function getEditorState() {
            var editorState = this.state.editorState;

            return editorState;
        }
    }, {
        key: 'toggleEditor',
        value: function toggleEditor(readOnly) {
            this.setState({
                readOnly: readOnly
            });
        }
    }, {
        key: 'toggleSource',
        value: function toggleSource(type, entityKey, entity) {
            var entityTypes = this.props.entityTypes;

            var entityType = entityTypes.find(function (item) {
                return item.type === type;
            });

            this.setState({
                readOnly: true,
                sourceOptions: {
                    entity: entity,
                    entityKey: entityKey,
                    entityType: entityType
                }
            });
        }
    }, {
        key: 'handleReturn',
        value: function handleReturn(e) {
            var enableLineBreak = this.props.enableLineBreak;
            var editorState = this.state.editorState;

            var contentState = editorState.getCurrentContent();
            var ret = false;

            // alt + enter opens links and other entities with a `url` property.
            if (e.altKey) {
                // Mark the return as handled even if there is no entity.
                // alt + enter should never create a newline anyway.
                ret = true;

                var entityKey = DraftUtils.getSelectionEntity(editorState);

                if (entityKey) {
                    var entityData = contentState.getEntity(entityKey).getData();

                    if (entityData.url) {
                        window.open(entityData.url);
                    }
                }
            } else {
                if (!enableLineBreak) {
                    // Quick hack to disable soft line breaks.
                    e.which = 0;
                }

                var newState = DraftUtils.handleNewLine(editorState, e);

                if (newState) {
                    ret = true;
                    this.onChange(newState);
                }
            }

            return ret;
        }
    }, {
        key: 'onFocus',
        value: function onFocus() {
            this.setState({
                hasFocus: true
            });
        }
    }, {
        key: 'onBlur',
        value: function onBlur() {
            this.setState({
                hasFocus: false
            });

            this.saveState();
        }
    }, {
        key: 'onTab',
        value: function onTab(event) {
            var maxListNesting = this.props.maxListNesting;
            var editorState = this.state.editorState;

            var newState = RichUtils.onTab(event, editorState, maxListNesting);

            this.onChange(newState);
            return true;
        }
    }, {
        key: 'handleKeyCommand',
        value: function handleKeyCommand(command) {
            var editorState = this.state.editorState;


            if (ENTITY_TYPES.includes(command)) {
                this.onRequestSource(command);
                return true;
            }

            if (BLOCK_TYPES.includes(command)) {
                this.toggleBlockType(command);
                return true;
            }

            if (INLINE_STYLES.includes(command)) {
                this.toggleInlineStyle(command);
                return true;
            }

            // Special case – some delete commands on atomic blocks are not covered by RichUtils.
            if (command === 'delete') {
                var _newState = DraftUtils.handleDeleteAtomic(editorState);

                if (_newState) {
                    this.onChange(_newState);
                    return true;
                }
            }

            var newState = RichUtils.handleKeyCommand(editorState, command);
            if (newState) {
                this.onChange(newState);
                return true;
            }

            return false;
        }
    }, {
        key: 'handleBeforeInput',
        value: function handleBeforeInput(char) {
            var _props2 = this.props,
                blockTypes = _props2.blockTypes,
                enableHorizontalRule = _props2.enableHorizontalRule;
            var editorState = this.state.editorState;

            var selection = editorState.getSelection();

            if (selection.isCollapsed()) {
                var block = DraftUtils.getSelectedBlock(editorState);
                var startOffset = selection.getStartOffset();
                var text = block.getText();
                var beforeBeforeInput = text.slice(0, startOffset);
                var mark = '' + beforeBeforeInput + char;
                var newEditorState = editorState;

                var newBlockType = behavior.handleBeforeInputBlockType(mark, blockTypes);

                if (newBlockType) {
                    newEditorState = DraftUtils.resetBlockWithType(newEditorState, newBlockType, text.replace(beforeBeforeInput, ''));
                }

                if (enableHorizontalRule && behavior.handleBeforeInputHR(mark, block)) {
                    newEditorState = DraftUtils.removeBlock(DraftUtils.addHorizontalRuleRemovingSelection(newEditorState), block.getKey());
                }

                if (newEditorState !== editorState) {
                    this.onChange(newEditorState);
                    return HANDLED;
                }
            }

            return NOT_HANDLED;
        }
    }, {
        key: 'toggleBlockType',
        value: function toggleBlockType(blockType) {
            var editorState = this.state.editorState;

            this.onChange(RichUtils.toggleBlockType(editorState, blockType));
        }
    }, {
        key: 'toggleInlineStyle',
        value: function toggleInlineStyle(inlineStyle) {
            var editorState = this.state.editorState;

            this.onChange(RichUtils.toggleInlineStyle(editorState, inlineStyle));
        }
    }, {
        key: 'onEditEntity',
        value: function onEditEntity(entityKey) {
            var entityTypes = this.props.entityTypes;
            var editorState = this.state.editorState;

            var content = editorState.getCurrentContent();
            var entity = content.getEntity(entityKey);
            var entityType = entityTypes.find(function (t) {
                return t.type === entity.type;
            });

            if (!entityType.block) {
                var entitySelection = DraftUtils.getEntitySelection(editorState, entityKey);
                var nextState = EditorState.acceptSelection(editorState, entitySelection);

                this.onChange(nextState);
            }

            this.toggleSource(entity.getType(), entityKey, entity);
        }
    }, {
        key: 'onRemoveEntity',
        value: function onRemoveEntity(entityKey, blockKey) {
            var entityTypes = this.props.entityTypes;
            var editorState = this.state.editorState;

            var content = editorState.getCurrentContent();
            var entity = content.getEntity(entityKey);
            var entityType = entityTypes.find(function (t) {
                return t.type === entity.type;
            });
            var newState = editorState;

            if (entityType.block) {
                newState = DraftUtils.removeBlockEntity(newState, entityKey, blockKey);
            } else {
                var entitySelection = DraftUtils.getEntitySelection(editorState, entityKey);

                newState = RichUtils.toggleLink(newState, entitySelection, null);
            }

            this.onChange(newState);
        }
    }, {
        key: 'addHR',
        value: function addHR() {
            var editorState = this.state.editorState;

            this.onChange(DraftUtils.addHorizontalRuleRemovingSelection(editorState));
        }
    }, {
        key: 'addBR',
        value: function addBR() {
            var editorState = this.state.editorState;

            this.onChange(DraftUtils.addLineBreak(editorState));
        }
    }, {
        key: 'onUndoRedo',
        value: function onUndoRedo(type) {
            var editorState = this.state.editorState;

            var newEditorState = editorState;

            if (type === UNDO_TYPE) {
                newEditorState = EditorState.undo(editorState);
            } else if (type === REDO_TYPE) {
                newEditorState = EditorState.redo(editorState);
            }

            this.onChange(newEditorState);
        }
    }, {
        key: 'blockRenderer',
        value: function blockRenderer(block) {
            var entityTypes = this.props.entityTypes;
            var editorState = this.state.editorState;

            var contentState = editorState.getCurrentContent();

            if (block.getType() !== BLOCK_TYPE.ATOMIC) {
                return null;
            }

            var entityKey = block.getEntityAt(0);

            if (!entityKey) {
                return {
                    editable: false
                };
            }

            var entity = contentState.getEntity(entityKey);
            var isHorizontalRule = entity.type === ENTITY_TYPE.HORIZONTAL_RULE;

            if (isHorizontalRule) {
                return {
                    component: DividerBlock,
                    editable: false
                };
            }

            var entityType = entityTypes.find(function (t) {
                return t.type === entity.type;
            });

            return {
                component: entityType.block,
                editable: false,
                props: {
                    // The editorState is available for arbitrary content manipulation.
                    editorState: editorState,
                    // Current entity to manage.
                    entity: entity,
                    // Current entityKey to manage.
                    entityKey: entityKey,
                    // Whole entityType configuration, as provided to the editor.
                    entityType: entityType,
                    // Make the whole editor read-only, except for the block.
                    lockEditor: this.lockEditor,
                    // Make the editor editable again.
                    unlockEditor: this.unlockEditor,
                    // Shorthand to edit entity data.
                    onEditEntity: this.onEditEntity.bind(null, entityKey),
                    // Shorthand to remove an entity, and the related block.
                    onRemoveEntity: this.onRemoveEntity.bind(null, entityKey, block.getKey()),
                    // Update the editorState with arbitrary changes.
                    onChange: this.onChange
                }
            };
        }
    }, {
        key: 'onRequestSource',
        value: function onRequestSource(entityType) {
            var editorState = this.state.editorState;

            var contentState = editorState.getCurrentContent();
            var entityKey = DraftUtils.getSelectionEntity(editorState);

            this.toggleSource(entityType, entityKey, entityKey ? contentState.getEntity(entityKey) : null);
        }
    }, {
        key: 'onCompleteSource',
        value: function onCompleteSource(nextState) {
            var _this3 = this;

            this.setState({
                sourceOptions: null
            }, function () {
                if (nextState) {
                    _this3.onChange(nextState);
                }

                window.setTimeout(function () {
                    _this3.setState({ readOnly: false }, function () {
                        window.setTimeout(function () {
                            _this3.focus();
                        }, 0);
                    });
                }, 0);
            });
        }
    }, {
        key: 'onCloseSource',
        value: function onCloseSource() {
            this.setState({
                sourceOptions: null,
                readOnly: false
            });
        }

        // Imperative focus API similar to that of Draft.js.
        // See https://draftjs.org/docs/advanced-topics-managing-focus.html#content.

    }, {
        key: 'focus',
        value: function focus() {
            this.editorRef.focus();
        }
    }, {
        key: 'renderSource',
        value: function renderSource() {
            var _state = this.state,
                editorState = _state.editorState,
                sourceOptions = _state.sourceOptions;


            if (sourceOptions && sourceOptions.entityType) {
                var Source = sourceOptions.entityType.source;

                return React.createElement(Source
                // The editorState is available for arbitrary content manipulation.
                , { editorState: editorState
                    // Takes the updated editorState, or null if there are no changes, and focuses the editor.
                    , onComplete: this.onCompleteSource
                    // Closes the source, without focusing the editor again.
                    , onClose: this.onCloseSource
                    // Current entity to edit, if any.
                    , entity: sourceOptions.entity
                    // Current entityKey to edit, if any.
                    , entityKey: sourceOptions.entityKey
                    // Whole entityType configuration, as provided to the editor.
                    , entityType: sourceOptions.entityType
                });
            }

            return null;
        }
    }, {
        key: 'render',
        value: function render() {
            var _this4 = this;

            var _props3 = this.props,
                placeholder = _props3.placeholder,
                enableHorizontalRule = _props3.enableHorizontalRule,
                enableLineBreak = _props3.enableLineBreak,
                showUndoControl = _props3.showUndoControl,
                showRedoControl = _props3.showRedoControl,
                stripPastedStyles = _props3.stripPastedStyles,
                spellCheck = _props3.spellCheck,
                textAlignment = _props3.textAlignment,
                textDirectionality = _props3.textDirectionality,
                autoCapitalize = _props3.autoCapitalize,
                autoComplete = _props3.autoComplete,
                autoCorrect = _props3.autoCorrect,
                ariaDescribedBy = _props3.ariaDescribedBy,
                blockTypes = _props3.blockTypes,
                inlineStyles = _props3.inlineStyles,
                inlineStylesExtra = _props3.inlineStylesExtra,
                entityTypes = _props3.entityTypes,
                controls = _props3.controls,
                maxListNesting = _props3.maxListNesting;
            var _state2 = this.state,
                editorState = _state2.editorState,
                hasFocus = _state2.hasFocus,
                readOnly = _state2.readOnly;

            var hidePlaceholder = DraftUtils.shouldHidePlaceholder(editorState);

            return React.createElement(
                'div',
                {
                    className: 'Draftail-Editor' + (readOnly ? ' Draftail-Editor--readonly' : '') + (hidePlaceholder ? ' Draftail-Editor--hide-placeholder' : '') + (hasFocus ? ' Draftail-Editor--focus' : '')
                },
                React.createElement(Toolbar, {
                    currentStyles: editorState.getCurrentInlineStyle(),
                    currentBlock: DraftUtils.getSelectedBlock(editorState).getType(),
                    enableHorizontalRule: enableHorizontalRule,
                    enableLineBreak: enableLineBreak,
                    showUndoControl: showUndoControl,
                    showRedoControl: showRedoControl,
                    blockTypes: blockTypes,
                    inlineStyles: inlineStyles,
                    entityTypes: entityTypes,
                    controls: controls,
                    readOnly: readOnly,
                    toggleBlockType: this.toggleBlockType,
                    toggleInlineStyle: this.toggleInlineStyle,
                    addHR: this.addHR,
                    addBR: this.addBR,
                    onUndoRedo: this.onUndoRedo,
                    onRequestSource: this.onRequestSource,
                    getEditorState: this.getEditorState,
                    onChange: this.onChange
                }),
                React.createElement(Editor, {
                    customStyleMap: behavior.getCustomStyleMap(inlineStyles.concat(inlineStylesExtra)),
                    ref: function ref(_ref) {
                        _this4.editorRef = _ref;
                    },
                    editorState: editorState,
                    onChange: this.onChange,
                    placeholder: placeholder,
                    readOnly: readOnly,
                    stripPastedStyles: stripPastedStyles,
                    spellCheck: spellCheck,
                    textAlignment: textAlignment,
                    textDirectionality: textDirectionality,
                    autoCapitalize: autoCapitalize,
                    autoComplete: autoComplete,
                    autoCorrect: autoCorrect,
                    ariaDescribedBy: ariaDescribedBy,
                    handleReturn: this.handleReturn,
                    keyBindingFn: behavior.getKeyBindingFn(blockTypes, inlineStyles, entityTypes),
                    handleKeyCommand: this.handleKeyCommand,
                    handleBeforeInput: this.handleBeforeInput,
                    onFocus: this.onFocus,
                    onBlur: this.onBlur,
                    onTab: this.onTab,
                    blockRendererFn: this.blockRenderer,
                    blockRenderMap: behavior.getBlockRenderMap(blockTypes),
                    blockStyleFn: behavior.blockStyleFn
                }),
                this.renderSource(),
                React.createElement(ListNestingStyles, { max: maxListNesting })
            );
        }
    }]);
    return DraftailEditor;
}(Component);

DraftailEditor.defaultProps = {
    // Initial content of the editor. Use this to edit pre-existing content.
    rawContentState: null,
    // Called when changes occured. Use this to persist editor content.
    onSave: function onSave() {},
    // Displayed when the editor is empty. Hidden if the user changes styling.
    placeholder: null,
    // Enable the use of horizontal rules in the editor.
    enableHorizontalRule: false,
    // Enable the use of line breaks in the editor.
    enableLineBreak: false,
    // Show undo control in the toolbar.
    showUndoControl: false,
    // Show redo control in the toolbar.
    showRedoControl: false,
    // Disable copy/paste of rich text in the editor.
    stripPastedStyles: true,
    // Set whether spellcheck is turned on for your editor.
    // See https://draftjs.org/docs/api-reference-editor.html#spellcheck.
    spellCheck: false,
    // Optionally set the overriding text alignment for this editor.
    // See https://draftjs.org/docs/api-reference-editor.html#textalignment.
    textAlignment: null,
    // Optionally set the overriding text directionality for this editor.
    // See https://draftjs.org/docs/api-reference-editor.html#textdirectionality.
    textDirectionality: null,
    // Set if auto capitalization is turned on and how it behaves.
    // See https://draftjs.org/docs/api-reference-editor.html#autocapitalize-string.
    autoCapitalize: null,
    // Set if auto complete is turned on and how it behaves.
    // See https://draftjs.org/docs/api-reference-editor.html#autocomplete-string.
    autoComplete: null,
    // Set if auto correct is turned on and how it behaves.
    // See https://draftjs.org/docs/api-reference-editor.html#autocorrect-string.
    autoCorrect: null,
    // See https://draftjs.org/docs/api-reference-editor.html#aria-props.
    ariaDescribedBy: null,
    // List of the available block types.
    blockTypes: [],
    // List of the available inline styles.
    inlineStyles: [],
    // List of inline styles with no automatic button.
    inlineStylesExtra: [],
    // List of the available entity types.
    entityTypes: [],
    // List of active decorators.
    decorators: [],
    // List of extra toolbar controls.
    controls: [],
    // Max level of nesting for list items. 0 = no nesting. Maximum = 10.
    maxListNesting: 1,
    // Frequency at which to call the save callback (ms).
    stateSaveInterval: 250
};

process.env.NODE_ENV !== "production" ? DraftailEditor.propTypes = {
    rawContentState: PropTypes.object,
    onSave: PropTypes.func,
    placeholder: PropTypes.string,
    enableHorizontalRule: PropTypes.oneOfType([PropTypes.bool, PropTypes.shape({
        // Describes the control in the editor UI, concisely.
        label: PropTypes.string,
        // Describes the control in the editor UI.
        description: PropTypes.string,
        // Represents the control in the editor UI.
        icon: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.node])
    })]),
    enableLineBreak: PropTypes.oneOfType([PropTypes.bool, PropTypes.shape({
        // Describes the control in the editor UI, concisely.
        label: PropTypes.string,
        // Describes the control in the editor UI.
        description: PropTypes.string,
        // Represents the control in the editor UI.
        icon: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.node])
    })]),
    showUndoControl: PropTypes.oneOfType([PropTypes.bool, PropTypes.shape({
        // Describes the control in the editor UI, concisely.
        label: PropTypes.string,
        // Describes the control in the editor UI.
        description: PropTypes.string,
        // Represents the control in the editor UI.
        icon: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.node])
    })]),
    showRedoControl: PropTypes.oneOfType([PropTypes.bool, PropTypes.shape({
        // Describes the control in the editor UI, concisely.
        label: PropTypes.string,
        // Describes the control in the editor UI.
        description: PropTypes.string,
        // Represents the control in the editor UI.
        icon: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.node])
    })]),
    stripPastedStyles: PropTypes.bool,
    spellCheck: PropTypes.bool,
    textAlignment: PropTypes.string,
    textDirectionality: PropTypes.string,
    autoCapitalize: PropTypes.string,
    autoComplete: PropTypes.string,
    autoCorrect: PropTypes.string,
    ariaDescribedBy: PropTypes.string,
    blockTypes: PropTypes.arrayOf(PropTypes.shape({
        // Unique type shared between block instances.
        type: PropTypes.string.isRequired,
        // Describes the block in the editor UI, concisely.
        label: PropTypes.string,
        // Describes the block in the editor UI.
        description: PropTypes.string,
        // Represents the block in the editor UI.
        icon: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.node]),
        // DOM element used to display the block within the editor area.
        element: PropTypes.string
    })),
    inlineStyles: PropTypes.arrayOf(PropTypes.shape({
        // Unique type shared between inline style instances.
        type: PropTypes.string.isRequired,
        // Describes the inline style in the editor UI, concisely.
        label: PropTypes.string,
        // Describes the inline style in the editor UI.
        description: PropTypes.string,
        // Represents the inline style in the editor UI.
        icon: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string), PropTypes.node]),
        // CSS properties (in JS format) to apply for styling within the editor area.
        style: PropTypes.Object
    })),
    inlineStylesExtra: PropTypes.arrayOf(PropTypes.shape({
        // Unique type shared between inline style instances.
        type: PropTypes.string.isRequired,
        // CSS properties (in JS format) to apply for styling within the editor area.
        style: PropTypes.Object
    })),
    entityTypes: PropTypes.arrayOf(PropTypes.shape({
        // Unique type shared between entity instances.
        type: PropTypes.string.isRequired,
        // Describes the entity in the editor UI, concisely.
        label: PropTypes.string,
        // Describes the entity in the editor UI.
        description: PropTypes.string,
        // Represents the entity in the editor UI.
        icon: PropTypes.oneOfType([
        // String icon = SVG path or symbol reference.
        PropTypes.string,
        // List of SVG paths.
        PropTypes.arrayOf(PropTypes.string),
        // Arbitrary React element.
        PropTypes.node]),
        // React component providing the UI to manage entities of this type.
        source: PropTypes.func.isRequired,
        // React component to display inline entities.
        decorator: PropTypes.func,
        // React component to display block-level entities.
        block: PropTypes.func,
        // Array of attributes the entity uses, to preserve when filtering entities on paste.
        // If undefined, all entity data is preserved.
        attributes: PropTypes.arrayOf(PropTypes.string),
        // Attribute - regex mapping, to whitelist entities based on their data on paste.
        // For example, { url: '^https:' } will only preserve links that point to HTTPS URLs.
        whitelist: PropTypes.object
    })),
    decorators: PropTypes.arrayOf(PropTypes.shape({
        // Determines which pieces of content are to be decorated.
        strategy: PropTypes.func,
        // React component to display the decoration.
        component: PropTypes.func
    })),
    // Additional React components to render in the toolbar.
    controls: PropTypes.arrayOf(PropTypes.func),
    maxListNesting: PropTypes.number,
    stateSaveInterval: PropTypes.number
} : void 0;

/**
 * Draftail's main API entry point. Exposes all of the modules people
 * will need to create their own editor instances from Draftail.
 */

export { DraftailEditor, Icon, ToolbarButton, DraftUtils, BLOCK_TYPE, ENTITY_TYPE, INLINE_STYLE };
