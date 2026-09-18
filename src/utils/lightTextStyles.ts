import React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { toReadableHindi } from './readableHindiText';

const HEAVY_WEIGHTS = new Set(['700', '800', '900', 'bold']);
const MEDIUM_WEIGHTS = new Set(['600', 'semibold']);

const lightenFontWeight = (value: unknown) => {
  if (typeof value === 'number') {
    if (value >= 700) return '600';
    if (value >= 600) return '500';
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.toLowerCase();
  if (HEAVY_WEIGHTS.has(normalized)) {
    return '600';
  }
  if (MEDIUM_WEIGHTS.has(normalized)) {
    return '500';
  }
  return value;
};

const lightenStyle = (style: unknown): unknown => {
  if (Array.isArray(style)) {
    return style.map(lightenStyle);
  }
  if (!style || typeof style !== 'object') {
    return style;
  }

  const nextStyle: Record<string, unknown> = {};
  Object.entries(style as Record<string, unknown>).forEach(([key, value]) => {
    nextStyle[key] = key === 'fontWeight' ? lightenFontWeight(value) : value;
  });
  return nextStyle;
};

const originalCreate = StyleSheet.create.bind(StyleSheet);
const AppText = Text as typeof Text & {
  defaultProps?: {
    style?: unknown;
  };
};
const originalCreateElement = React.createElement as (...args: any[]) => React.ReactElement;
const originalAlert = Alert.alert.bind(Alert);
const TRANSLATABLE_PROP_NAMES = new Set([
  'accessibilityLabel',
  'cancelText',
  'confirmText',
  'label',
  'modalTitle',
  'placeholder',
  'searchPlaceholder',
  'title',
]);

const translateTextChildren = (children: unknown): unknown => {
  if ((globalThis as { __crewcamLanguage?: string }).__crewcamLanguage !== 'hi') {
    return children;
  }

  if (typeof children === 'string') {
    return toReadableHindi(children);
  }
  if (Array.isArray(children)) {
    return children.map(translateTextChildren);
  }
  return children;
};

const translateProps = (props: Record<string, unknown> | null) => {
  if ((globalThis as { __crewcamLanguage?: string }).__crewcamLanguage !== 'hi' || !props) {
    return props;
  }

  let hasChanges = false;
  const nextProps: Record<string, unknown> = { ...props };
  Object.entries(nextProps).forEach(([key, value]) => {
    if (TRANSLATABLE_PROP_NAMES.has(key) && typeof value === 'string') {
      nextProps[key] = toReadableHindi(value);
      hasChanges = true;
    }
  });

  return hasChanges ? nextProps : props;
};

StyleSheet.create = ((styles: Record<string, unknown>) => {
  const lightStyles: Record<string, unknown> = {};
  Object.entries(styles).forEach(([key, value]) => {
    lightStyles[key] = lightenStyle(value);
  });
  return originalCreate(lightStyles);
}) as typeof StyleSheet.create;

AppText.defaultProps = {
  ...AppText.defaultProps,
  style: [{ fontWeight: '400' }, AppText.defaultProps?.style],
};

React.createElement = ((type: any, props: Record<string, unknown> | null, ...children: unknown[]) => {
  if (type === Text) {
    return originalCreateElement(
      type,
      translateProps(props),
      ...children.map(translateTextChildren),
    );
  }

  return originalCreateElement(type, translateProps(props), ...children);
}) as typeof React.createElement;

Alert.alert = ((title?: string, message?: string, buttons?: any[], options?: any) => {
  if ((globalThis as { __crewcamLanguage?: string }).__crewcamLanguage !== 'hi') {
    return originalAlert(title, message, buttons, options);
  }

  const translatedButtons = buttons?.map(button => ({
    ...button,
    text: typeof button?.text === 'string' ? toReadableHindi(button.text) : button?.text,
  }));

  return originalAlert(
    typeof title === 'string' ? toReadableHindi(title) : title,
    typeof message === 'string' ? toReadableHindi(message) : message,
    translatedButtons,
    options,
  );
}) as typeof Alert.alert;
