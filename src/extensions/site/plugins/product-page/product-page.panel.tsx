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
  ToggleSwitch,
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
  const [showRetailPrice, setShowRetailPrice] = useState(false);

  useEffect(() => {
    widget.getProp('price-color').then((value) => {
      const nextColor = typeof value === 'string' && value ? value : DEFAULT_PRICE_COLOR;
      setPriceColor(nextColor);
    });

    widget.getProp('price-font').then((value) => {
      const nextFont = typeof value === 'string' ? value : '';
      setPriceFont(nextFont);
    });

    // Off unless the merchant turns it on, so stores still showing Wix's own price don't show it twice.
    widget.getProp('show-retail-price').then((value) => {
      setShowRetailPrice(value === 'true');
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
          <SidePanel.Section title="Retail Price">
            <Box direction="vertical" paddingLeft="SP5" paddingRight="SP5" paddingTop="SP4" paddingBottom="SP4" gap="SP2">
              <Box align="space-between" verticalAlign="middle" gap="SP3">
                <Text size="small">Show retail price to non-wholesale visitors</Text>
                <ToggleSwitch
                  size="small"
                  checked={showRetailPrice}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setShowRetailPrice(next);
                    widget.setProp('show-retail-price', next ? 'true' : 'false');
                  }}
                />
              </Box>
              <Text size="tiny" secondary>
                Turn on if you've hidden Wix's own product price, so shoppers who aren't approved wholesalers still see a price.
              </Text>
            </Box>
          </SidePanel.Section>
          <SidePanel.Section title="Price Styles">
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
