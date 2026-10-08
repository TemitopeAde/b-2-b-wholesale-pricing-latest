import React, { type FC, useEffect, useState } from 'react';
import { widget, inputs } from '@wix/editor';
import {
  SidePanel,
  WixDesignSystemProvider,
  FormField,
  ColorInput,
  Box,
  Text,
  TextButton,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';

const DEFAULT_PRICE_COLOR = '#000000';

const extractFontFamily = (fontString: string): string => {
  if (!fontString || typeof fontString !== 'string') return 'Select Font';
  const match = fontString.match(/"([^"]+)"\s*$/);
  if (match && match[1]) return match[1];
  return fontString || 'Select Font';
};

const Panel: FC = () => {
  const [priceColor, setPriceColor] = useState(DEFAULT_PRICE_COLOR);
  const [priceFont, setPriceFont] = useState('');

  useEffect(() => {
    widget.getProp('price-color').then((value) => {
      const nextColor = typeof value === 'string' && value ? value : DEFAULT_PRICE_COLOR;
      setPriceColor(nextColor);
    });

    widget.getProp('price-font').then((value) => {
      const nextFont = typeof value === 'string' ? value : '';
      setPriceFont(nextFont);
    });
  }, []);

  useEffect(() => {
    if (priceFont) {
      widget.setPreloadFonts([priceFont]);
      return;
    }
  }, [priceFont]);

  return (
    <WixDesignSystemProvider>
      <SidePanel width="300">
        <SidePanel.Header title="Product Price Styles" />
        <SidePanel.Content noPadding>
          <SidePanel.Section title="Wholesale Price">
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
