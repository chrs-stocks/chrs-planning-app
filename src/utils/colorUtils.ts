// src/utils/colorUtils.ts

/**
 * Determines if a given hex color is light or dark.
 * @param hexColor The color in hex format (e.g., "#RRGGBB").
 * @returns 'light' if the color is light, 'dark' if it's dark.
 */
const getBrightness = (hexColor: string): number => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  // Perceived brightness formula (ITU-R BT.709)
  return (r * 0.2126 + g * 0.7152 + b * 0.0722);
};

/**
 * Returns a contrasting text color (black or white) for a given background hex color.
 * @param hexColor The background color in hex format (e.g., "#RRGGBB").
 * @returns "#000000" (black) for light backgrounds, "#FFFFFF" (white) for dark backgrounds.
 */
export const getContrastingTextColor = (hexColor: string): string => {
  // Remove '#' if present
  const cleanHex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;

  // Handle shorthand hex codes (e.g., #FFF)
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(char => char + char).join('')
    : cleanHex;

  const brightness = getBrightness('#' + fullHex);

  // Use a threshold to determine if the color is light or dark
  // A common threshold is 128 (out of 255)
  return brightness > 180 ? '#000000' : '#FFFFFF'; // Use a higher threshold for better contrast with employee colors
};
