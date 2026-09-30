import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { translateUiText, type SupportedLanguageCode } from '../../i18n/index.ts';

interface NodeTranslationRecord {
  original: string;
  lastTranslated: string;
}

const textNodeRegistry = new WeakMap<Node, NodeTranslationRecord>();
const attrNodeRegistry = new WeakMap<Element, Record<string, NodeTranslationRecord>>();

const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'] as const;

function shouldSkipElement(el: Element | null): boolean {
  if (!el) return true;
  const tag = el.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE' || tag === 'PRE') {
    return true;
  }
  if (el.closest('[data-no-translate="true"]')) {
    return true;
  }
  return false;
}

function localizeTextNode(node: Node, lang: SupportedLanguageCode): void {
  const parent = node.parentElement;
  if (shouldSkipElement(parent)) return;

  const currentVal = node.nodeValue || '';
  if (!currentVal.trim()) return;

  let record = textNodeRegistry.get(node);
  if (!record || (currentVal !== record.original && currentVal !== record.lastTranslated)) {
    record = { original: currentVal, lastTranslated: currentVal };
    textNodeRegistry.set(node, record);
  }

  const nextVal = lang === 'en' ? record.original : translateUiText(record.original, lang);
  if (nextVal && nextVal !== currentVal) {
    record.lastTranslated = nextVal;
    node.nodeValue = nextVal;
  }
}

function localizeElementAttributes(el: Element, lang: SupportedLanguageCode): void {
  if (shouldSkipElement(el)) return;

  let attrMap = attrNodeRegistry.get(el);
  for (const attr of TRANSLATABLE_ATTRS) {
    const currentVal = el.getAttribute(attr);
    if (!currentVal || !currentVal.trim()) continue;

    if (!attrMap) {
      attrMap = {};
      attrNodeRegistry.set(el, attrMap);
    }

    let record = attrMap[attr];
    if (!record || (currentVal !== record.original && currentVal !== record.lastTranslated)) {
      record = { original: currentVal, lastTranslated: currentVal };
      attrMap[attr] = record;
    }

    const nextVal = lang === 'en' ? record.original : translateUiText(record.original, lang);
    if (nextVal && nextVal !== currentVal) {
      record.lastTranslated = nextVal;
      el.setAttribute(attr, nextVal);
    }
  }
}

function localizeSubtree(root: Node, lang: SupportedLanguageCode): void {
  if (root.nodeType === Node.TEXT_NODE) {
    localizeTextNode(root, lang);
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (shouldSkipElement(el)) return;
    localizeElementAttributes(el, lang);
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  );

  let current: Node | null = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      localizeTextNode(current, lang);
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      localizeElementAttributes(current as Element, lang);
    }
    current = walker.nextNode();
  }
}

export const GlobalDomLocalizer: React.FC = () => {
  const { language, activeModule } = useApp();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;

    let isApplying = false;
    const runPass = () => {
      if (isApplying) return;
      isApplying = true;
      try {
        localizeSubtree(document.body, language);
      } finally {
        isApplying = false;
      }
    };

    runPass();

    const observer = new MutationObserver((mutations) => {
      if (isApplying) return;
      isApplying = true;
      try {
        for (const mutation of mutations) {
          if (mutation.type === 'characterData') {
            localizeTextNode(mutation.target, language);
          } else if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              localizeSubtree(node, language);
            });
          } else if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
            localizeElementAttributes(mutation.target as Element, language);
          }
        }
      } finally {
        isApplying = false;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label']
    });

    return () => {
      observer.disconnect();
    };
  }, [language, activeModule]);

  return null;
};
