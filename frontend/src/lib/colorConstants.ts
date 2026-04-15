export type ColorOption = {
  name: string;
  hex: string;
};

export type ColorGroup = {
  label: string;
  colors: ColorOption[];
};

export const COLOR_GROUPS: ColorGroup[] = [
  {
    label: 'Neutrals',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Off White', hex: '#F8F8F0' },
      { name: 'Cream', hex: '#FFFDD0' },
      { name: 'Ivory', hex: '#FFFFF0' },
      { name: 'Beige', hex: '#F5F5DC' },
      { name: 'Sand Beige', hex: '#DCC7A1' },
      { name: 'Taupe', hex: '#B38B6D' },
      { name: 'Light Brown', hex: '#A67B5B' },
      { name: 'Dark Brown', hex: '#5C4033' },
      { name: 'Grey', hex: '#808080' },
      { name: 'Charcoal', hex: '#36454F' },
      { name: 'Black', hex: '#000000' }
    ]
  },
  {
    label: 'Reds & Maroons',
    colors: [
      { name: 'Bright Red', hex: '#FF0000' },
      { name: 'Scarlet Red', hex: '#FF2400' },
      { name: 'Crimson Red', hex: '#DC143C' },
      { name: 'Deep Red', hex: '#8B0000' },
      { name: 'Ruby Red', hex: '#9B111E' },
      { name: 'Maroon', hex: '#800000' },
      { name: 'Wine', hex: '#722F37' },
      { name: 'Burgundy', hex: '#800020' },
      { name: 'Rust', hex: '#B7410E' },
      { name: 'Brick Red', hex: '#B22222' }
    ]
  },
  {
    label: 'Yellows & Oranges',
    colors: [
      { name: 'Mustard', hex: '#FFDB58' },
      { name: 'Turmeric Yellow', hex: '#E8A317' },
      { name: 'Lemon Yellow', hex: '#FFF44F' },
      { name: 'Golden Yellow', hex: '#FFD700' },
      { name: 'Saffron', hex: '#F4C430' },
      { name: 'Amber', hex: '#FFBF00' },
      { name: 'Peach Orange', hex: '#FFCC99' },
      { name: 'Coral Orange', hex: '#FF7F50' },
      { name: 'Burnt Orange', hex: '#CC5500' },
      { name: 'Terracotta', hex: '#E2725B' }
    ]
  },
  {
    label: 'Greens',
    colors: [
      { name: 'Olive Green', hex: '#556B2F' },
      { name: 'Mehendi Green', hex: '#3A5F0B' },
      { name: 'Bottle Green', hex: '#006A4E' },
      { name: 'Forest Green', hex: '#228B22' },
      { name: 'Emerald', hex: '#50C878' },
      { name: 'Sea Green', hex: '#2E8B57' },
      { name: 'Mint Green', hex: '#98FF98' },
      { name: 'Pastel Green', hex: '#77DD77' },
      { name: 'Sage Green', hex: '#9CAF88' }
    ]
  },
  {
    label: 'Blues',
    colors: [
      { name: 'Sky Blue', hex: '#87CEEB' },
      { name: 'Powder Blue', hex: '#B0E0E6' },
      { name: 'Ice Blue', hex: '#D6F1FF' },
      { name: 'Aqua Blue', hex: '#00B7EB' },
      { name: 'Cobalt Blue', hex: '#0047AB' },
      { name: 'Royal Blue', hex: '#4169E1' },
      { name: 'Navy Blue', hex: '#1A237E' },
      { name: 'Teal', hex: '#008080' }
    ]
  },
  {
    label: 'Pastels',
    colors: [
      { name: 'Peach', hex: '#FFDAB9' },
      { name: 'Mint', hex: '#AAF0D1' },
      { name: 'Lavender', hex: '#E6E6FA' },
      { name: 'Baby Pink', hex: '#F4C2C2' },
      { name: 'Powder Grey', hex: '#C0C0C0' },
      { name: 'Ice Blue', hex: '#D6F1FF' },
      { name: 'Pastel Yellow', hex: '#FDFD96' },
      { name: 'Powder Peach', hex: '#FFD8B1' }
    ]
  },
  {
    label: 'Premium / Royal',
    colors: [
      { name: 'Gold', hex: '#D4AF37' },
      { name: 'Champagne', hex: '#F7E7CE' },
      { name: 'Copper', hex: '#B87333' },
      { name: 'Bronze', hex: '#CD7F32' },
      { name: 'Silver', hex: '#C0C0C0' },
      { name: 'Rose Gold', hex: '#B76E79' }
    ]
  },
  {
    label: 'Purples & Violets',
    colors: [
      { name: 'Lavender', hex: '#E6E6FA' },
      { name: 'Lilac', hex: '#C8A2C8' },
      { name: 'Purple', hex: '#800080' },
      { name: 'Deep Purple', hex: '#673AB7' },
      { name: 'Plum', hex: '#8E4585' },
      { name: 'Violet', hex: '#8F00FF' }
    ]
  },
  {
    label: 'Pinks',
    colors: [
      { name: 'Baby Pink', hex: '#F4C2C2' },
      { name: 'Blush Pink', hex: '#FEC5E5' },
      { name: 'Onion Pink', hex: '#E8A2B3' },
      { name: 'Rose Pink', hex: '#FF66CC' },
      { name: 'Hot Pink', hex: '#FF69B4' },
      { name: 'Dusty Pink', hex: '#D8A7B1' },
      { name: 'Rani Pink', hex: '#E91E63' }
    ]
  }
];

export const ALL_COLORS = COLOR_GROUPS.flatMap((group) => group.colors);
