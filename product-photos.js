// product-photos.js — Real Product Photos via Unsplash
// Free, no API key, direct photo URLs

// Curated Unsplash photo IDs per category and product type
const PRODUCT_PHOTOS = {
  Electronics: {
    default: 'photo-1468495244123-6c6c332eeece',
    keywords: {
      headphone: 'photo-1505740420928-5e560c06d30e',
      earphone: 'photo-1590658268037-6bf12165a8df',
      earbud: 'photo-1590658268037-6bf12165a8df',
      keyboard: 'photo-1587829741301-dc798b83add3',
      mouse: 'photo-1527864550417-7fd91fc51a46',
      laptop: 'photo-1496181133206-80ce9b88a853',
      monitor: 'photo-1527443224154-c4a3942d3acf',
      phone: 'photo-1511707171634-5f897ff02aa9',
      mobile: 'photo-1511707171634-5f897ff02aa9',
      tablet: 'photo-1544244015-0df4b3ffc6b0',
      camera: 'photo-1516035069371-29a1b244cc32',
      speaker: 'photo-1608043152269-423dbba4e7e1',
      charger: 'photo-1609091839311-d5365f9ff1c5',
      power: 'photo-1609091839311-d5365f9ff1c5',
      cable: 'photo-1558618666-fcd25c85cd64',
      bulb: 'photo-1558618666-fcd25c85cd64',
      smart: 'photo-1558618666-fcd25c85cd64',
      tv: 'photo-1593359677879-a4bb92f829d1',
      watch: 'photo-1523275335684-37898b6baf30',
      router: 'photo-1558618666-fcd25c85cd64',
      stand: 'photo-1512054502232-10a0a035d672'
    }
  },
  Fashion: {
    default: 'photo-1441984904996-e0b6ba687e04',
    keywords: {
      kurta: 'photo-1583391733956-6c78276477e2',
      shirt: 'photo-1598033129183-c4f50c736f10',
      tshirt: 'photo-1521572163474-6864f9cf17ab',
      dress: 'photo-1515886657613-9f3515b0c78f',
      jeans: 'photo-1542272604-787c3835535d',
      pant: 'photo-1624378439575-d8705ad7ae80',
      trouser: 'photo-1624378439575-d8705ad7ae80',
      jacket: 'photo-1548126032-079a0fb0099d',
      coat: 'photo-1539533113208-f6df8cc8b543',
      saree: 'photo-1583391733956-6c78276477e2',
      lehenga: 'photo-1583391733956-6c78276477e2',
      wallet: 'photo-1627123424574-724758594785',
      bag: 'photo-1548036328-c9fa89d128fa',
      handbag: 'photo-1548036328-c9fa89d128fa',
      shoes: 'photo-1542291026-7eec264c27ff',
      sneaker: 'photo-1542291026-7eec264c27ff',
      sandal: 'photo-1603487742131-4160ec999306',
      cap: 'photo-1588850561407-ed78c282e89b',
      hat: 'photo-1588850561407-ed78c282e89b',
      sunglass: 'photo-1572635196237-14b3f281503f',
      watch: 'photo-1523275335684-37898b6baf30',
      jewelry: 'photo-1515562141207-7a88fb7ce338',
      necklace: 'photo-1515562141207-7a88fb7ce338',
      ring: 'photo-1605100804763-247f67b3557e'
    }
  },
  Home: {
    default: 'photo-1555041469-a586c61ea9bc',
    keywords: {
      sofa: 'photo-1555041469-a586c61ea9bc',
      chair: 'photo-1506439773649-6e0eb8cfb237',
      table: 'photo-1555041469-a586c61ea9bc',
      bed: 'photo-1505693416388-ac5ce068fe85',
      mattress: 'photo-1505693416388-ac5ce068fe85',
      lamp: 'photo-1507473885765-e6ed057f782c',
      light: 'photo-1507473885765-e6ed057f782c',
      curtain: 'photo-1586023492125-27b2c045efd7',
      rug: 'photo-1558618666-fcd25c85cd64',
      pillow: 'photo-1584100936595-c0654b55a2e2',
      blanket: 'photo-1584100936595-c0654b55a2e2',
      cookware: 'photo-1556909172-54557c7e4fb7',
      pan: 'photo-1578662996442-48f60103fc96',
      pot: 'photo-1578662996442-48f60103fc96',
      knife: 'photo-1593618998160-e34014e67546',
      mixer: 'photo-1585515320310-259814833e62',
      blender: 'photo-1585515320310-259814833e62',
      frame: 'photo-1513519245088-0e12902e35a6',
      clock: 'photo-1563861826100-9cb868fdbe1c',
      plant: 'photo-1485955900006-10f4d324d411',
      vase: 'photo-1485955900006-10f4d324d411',
      shelf: 'photo-1555041469-a586c61ea9bc',
      storage: 'photo-1555041469-a586c61ea9bc'
    }
  },
  Grocery: {
    default: 'photo-1542838132-92c53300491e',
    keywords: {
      tea: 'photo-1556909172-54557c7e4fb7',
      coffee: 'photo-1497935586351-b67a49e012bf',
      rice: 'photo-1586201375761-83865001e31c',
      dal: 'photo-1585937421612-70a008356fbe',
      oil: 'photo-1474979266404-7eaacbcd87c5',
      coconut: 'photo-1474979266404-7eaacbcd87c5',
      spice: 'photo-1596040033229-a9821ebd058d',
      masala: 'photo-1596040033229-a9821ebd058d',
      sugar: 'photo-1558618047-3c8c76ca7d13',
      salt: 'photo-1558618047-3c8c76ca7d13',
      flour: 'photo-1586201375761-83865001e31c',
      honey: 'photo-1587049352851-8d4e89133924',
      jam: 'photo-1601493700631-2b16ec4b4716',
      chocolate: 'photo-1606312619070-d48b4c652a52',
      biscuit: 'photo-1558961363-fa8fdf82db35',
      snack: 'photo-1558961363-fa8fdf82db35',
      juice: 'photo-1622597467836-f3285f2131b8',
      water: 'photo-1548839140-29a749e1cf4d',
      fruit: 'photo-1610832958506-aa56368176cf',
      vegetable: 'photo-1557844352-761f2565b576',
      organic: 'photo-1542838132-92c53300491e',
      dry: 'photo-1585937421612-70a008356fbe',
      nut: 'photo-1556909172-54557c7e4fb7'
    }
  },
  Books: {
    default: 'photo-1544947950-fa07a98d237f',
    keywords: {
      novel: 'photo-1512820790803-83ca734da794',
      fiction: 'photo-1512820790803-83ca734da794',
      self: 'photo-1544947950-fa07a98d237f',
      help: 'photo-1544947950-fa07a98d237f',
      business: 'photo-1507679799987-c73779587ccf',
      tech: 'photo-1518770660439-4636190af475',
      science: 'photo-1532012197267-da84d127e765',
      history: 'photo-1524995997946-a1c2e315a42f',
      children: 'photo-1503676260728-1c00da094a0b',
      comic: 'photo-1578632767115-351597cf2477',
      education: 'photo-1497633762265-9d179a990aa6',
      study: 'photo-1497633762265-9d179a990aa6',
      notebook: 'photo-1517842645767-c639042777db',
      magazine: 'photo-1553729459-efe14ef6055d'
    }
  },
  Sports: {
    default: 'photo-1461896836934-ffe607ba8211',
    keywords: {
      cricket: 'photo-1531415074968-036ba1b575da',
      bat: 'photo-1531415074968-036ba1b575da',
      ball: 'photo-1579952363873-27f3bade9f55',
      football: 'photo-1575361204480-aadea25e6e68',
      badminton: 'photo-1626224583764-f87db24ac4ea',
      tennis: 'photo-1554068865-24ceec7e9818',
      yoga: 'photo-1544367567-0f2fcb009e0b',
      mat: 'photo-1544367567-0f2fcb009e0b',
      gym: 'photo-1534438327276-14e5300c3a48',
      dumbbell: 'photo-1534438327276-14e5300c3a48',
      cycle: 'photo-1485965120184-e220f721d03e',
      swim: 'photo-1530549387789-4c1017266635',
      shoes: 'photo-1542291026-7eec264c27ff',
      glove: 'photo-1434494878577-86c23bcb06b9',
      helmet: 'photo-1558618047-3c8c76ca7d13',
      skipping: 'photo-1434494878577-86c23bcb06b9'
    }
  },
  Beauty: {
    default: 'photo-1596462502278-27bfdc403348',
    keywords: {
      lipstick: 'photo-1586495777744-4e6b0c2c3e80',
      foundation: 'photo-1596462502278-27bfdc403348',
      cream: 'photo-1556228720-195a672e8a03',
      moisturizer: 'photo-1556228720-195a672e8a03',
      serum: 'photo-1620916566398-39f1143ab7be',
      sunscreen: 'photo-1556228578-8c89e6adf883',
      shampoo: 'photo-1556228453-8a3c87a09d61',
      conditioner: 'photo-1556228453-8a3c87a09d61',
      perfume: 'photo-1541643600914-78b084683702',
      deodorant: 'photo-1585386959984-a4155224a1ad',
      nail: 'photo-1604654894610-df63bc536371',
      mascara: 'photo-1631214524020-3e05afe0ccae',
      eyeshadow: 'photo-1583241475880-083f84372725',
      face: 'photo-1556228720-195a672e8a03',
      hair: 'photo-1522338242992-e1a54906a8da',
      skin: 'photo-1556228720-195a672e8a03',
      organic: 'photo-1556228578-8c89e6adf883'
    }
  },
  Handmade: {
    default: 'photo-1558618047-3c8c76ca7d13',
    keywords: {
      pottery: 'photo-1565193566173-7a0ee3dbe261',
      ceramic: 'photo-1565193566173-7a0ee3dbe261',
      jewelry: 'photo-1515562141207-7a88fb7ce338',
      weave: 'photo-1558618047-3c8c76ca7d13',
      block: 'photo-1583391733956-6c78276477e2',
      print: 'photo-1583391733956-6c78276477e2',
      embroidery: 'photo-1558618047-3c8c76ca7d13',
      painting: 'photo-1513519245088-0e12902e35a6',
      wood: 'photo-1514644973083-6c0d8cb44baa',
      candle: 'photo-1602028915047-37269d1a73f7',
      soap: 'photo-1600857544200-b2f468e9c8ce',
      bag: 'photo-1548036328-c9fa89d128fa',
      jute: 'photo-1548036328-c9fa89d128fa',
      terracotta: 'photo-1565193566173-7a0ee3dbe261',
      macrame: 'photo-1558618047-3c8c76ca7d13'
    }
  },
  Other: {
    default: 'photo-1553481187-be93c21490a9',
    keywords: {}
  }
};

// ── GET PHOTO URL ─────────────────────────────────────────────────────────────

function vsGetProductPhoto(productName, category, size) {
  size = size || '400x400';
  const w = size.split('x')[0] || 400;
  const h = size.split('x')[1] || 400;

  const catData = PRODUCT_PHOTOS[category] || PRODUCT_PHOTOS.Other;
  const nameLower = (productName || '').toLowerCase();

  // Find best keyword match
  let photoId = catData.default;
  const keywords = catData.keywords || {};
  for (const [keyword, id] of Object.entries(keywords)) {
    if (nameLower.includes(keyword)) { photoId = id; break; }
  }

  return `https://images.unsplash.com/${photoId}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

// ── RENDER PRODUCT IMAGE ──────────────────────────────────────────────────────

function vsProductImage(product, size, className, style) {
  if (product.photoUrl) {
    return `<img src="${product.photoUrl}" alt="${product.name}"
      width="${size||200}" height="${size||200}"
      style="width:100%;height:100%;object-fit:cover;${style||''}"
      class="${className||''}"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div style="display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:${Math.round((size||200)/3)}px;">${product.emoji||'📦'}</div>`;
  }
  const url = vsGetProductPhoto(product.name, product.category, size ? size+'x'+size : '400x400');
  return `<img src="${url}" alt="${product.name}"
    width="${size||200}" height="${size||200}"
    style="width:100%;height:100%;object-fit:cover;border-radius:6px;${style||''}"
    class="${className||''}"
    loading="lazy"
    onerror="this.outerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:${Math.round((size||200)/3)}px;\\'>${product.emoji||'📦'}</div>'">`;
}

console.log('VibeStore Product Photos loaded ✅');
