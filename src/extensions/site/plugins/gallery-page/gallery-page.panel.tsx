import React, { type FC, useEffect, useState } from 'react';
import { widget, inputs } from '@wix/editor';
import {
  SidePanel,
  WixDesignSystemProvider,
  Dropdown,
  FormField,
  Box,
  ColorInput,
  Text,
  TextButton,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';

type NativePriceMode = 'strike' | 'hide';

const DEFAULT_NATIVE_PRICE_MODE: NativePriceMode = 'strike';
const DEFAULT_PRICE_COLOR = '#000000';

const NATIVE_PRICE_MODE_OPTIONS = [
  {
    id: 'strike',
    value: 'strike',
    label: 'Show native price with strikethrough',
  },
  {
    id: 'hide',
    value: 'hide',
    label: 'Hide native price',
  },
];

const normalizeNativePriceMode = (value: string | null | undefined): NativePriceMode =>
  value === 'hide' ? 'hide' : DEFAULT_NATIVE_PRICE_MODE;

const extractFontFamily = (fontString: string): string => {
  if (!fontString || typeof fontString !== 'string') return 'Select Font';
  const match = fontString.match(/"([^"]+)"\s*$/);
  if (match && match[1]) return match[1];
  return fontString || 'Select Font';
};

const Panel: FC = () => {
  const [nativePriceMode, setNativePriceMode] = useState<NativePriceMode>(DEFAULT_NATIVE_PRICE_MODE);
  const [priceColor, setPriceColor] = useState(DEFAULT_PRICE_COLOR);
  const [priceFont, setPriceFont] = useState('');

  useEffect(() => {
    widget.getProp('native-price-mode').then((value) => {
      const normalizedValue = normalizeNativePriceMode(typeof value === 'string' ? value : undefined);
      setNativePriceMode(normalizedValue);

      if (normalizedValue !== value) {
        widget.setProp('native-price-mode', normalizedValue);
      }
    });

    widget.getProp('price-color').then((value) => {
      setPriceColor(typeof value === 'string' && value ? value : DEFAULT_PRICE_COLOR);
    });

    widget.getProp('price-font').then((value) => {
      const nextFont = typeof value === 'string' ? value : '';
      setPriceFont(nextFont);
    });
  }, []);

  useEffect(() => {
    if (priceFont) {
      widget.setPreloadFonts([priceFont]);
    }
  }, [priceFont]);

  return (
    <WixDesignSystemProvider>
      <SidePanel width="300">
        <SidePanel.Header title="Gallery Product Price Settings" />
        <SidePanel.Content noPadding>
          <SidePanel.Section title="Native Price Display">
            <Box paddingLeft="SP5" paddingRight="SP5" paddingTop="SP4" paddingBottom="SP8">
              <FormField label="When wholesale price is available">
                <Dropdown
                  selectedId={nativePriceMode}
                  options={NATIVE_PRICE_MODE_OPTIONS}
                  onSelect={(option) => {
                    const nextMode = normalizeNativePriceMode(option?.id as string);
                    setNativePriceMode(nextMode);
                    widget.setProp('native-price-mode', nextMode);
                  }}
                />
              </FormField>
            </Box>
          </SidePanel.Section>
          <SidePanel.Section title="Wholesale Price Styles">
            <Box direction="vertical" paddingLeft="SP5" paddingRight="SP5" paddingTop="SP4" paddingBottom="SP8" gap="SP4">
              <Box align="space-between" verticalAlign="middle">
                <Text size="small">Text color</Text>
                <ColorInput
                  value={priceColor}
                  onConfirm={(color) => {
                    const value = typeof color === 'string' ? color : DEFAULT_PRICE_COLOR;
                    setPriceColor(value);
                    widget.setProp('price-color', value);
                  }}
                  popoverAppendTo="window"
                />
              </Box>

              <FormField label="Font Family" labelPlacement="top">
                <TextButton
                  onClick={() => {
                    inputs.selectFont(
                      { font: priceFont },
                      {
                        onChange: (value: any) => {
                          const nextFont = value?.font ?? '';
                          setPriceFont(nextFont);
                          widget.setProp('price-font', nextFont);
                        },
                      }
                    );
                  }}
                >
                  {extractFontFamily(priceFont)}
                </TextButton>
              </FormField>
            </Box>
          </SidePanel.Section>
        </SidePanel.Content>
      </SidePanel>
    </WixDesignSystemProvider>
  );
};

export default Panel;
