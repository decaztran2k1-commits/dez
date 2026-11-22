import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_PROVINCES = [
  { province_code: '01', name: 'Thành phố Hà Nội' },
  { province_code: '79', name: 'Thành phố Hồ Chí Minh' },
  { province_code: '31', name: 'Thành phố Hải Phòng' },
  { province_code: '48', name: 'Thành phố Đà Nẵng' },
  { province_code: '92', name: 'Thành phố Cần Thơ' },
  { province_code: '46', name: 'Thành phố Huế' },
  { province_code: '24', name: 'Thành phố Bắc Ninh' },
  { province_code: '22', name: 'Thành phố Quảng Ninh' },
  { province_code: '75', name: 'Thành phố Đồng Nai' },
  { province_code: '04', name: 'Tỉnh Cao Bằng' },
  { province_code: '08', name: 'Tỉnh Tuyên Quang' },
  { province_code: '11', name: 'Tỉnh Điện Biên' },
  { province_code: '12', name: 'Tỉnh Lai Châu' },
  { province_code: '14', name: 'Tỉnh Sơn La' },
  { province_code: '15', name: 'Tỉnh Lào Cai' },
  { province_code: '19', name: 'Tỉnh Thái Nguyên' },
  { province_code: '20', name: 'Tỉnh Lạng Sơn' },
  { province_code: '25', name: 'Tỉnh Phú Thọ' },
  { province_code: '33', name: 'Tỉnh Hưng Yên' },
  { province_code: '37', name: 'Tỉnh Ninh Bình' },
  { province_code: '38', name: 'Tỉnh Thanh Hóa' },
  { province_code: '40', name: 'Tỉnh Nghệ An' },
  { province_code: '42', name: 'Tỉnh Hà Tĩnh' },
  { province_code: '44', name: 'Tỉnh Quảng Trị' },
  { province_code: '51', name: 'Tỉnh Quảng Ngãi' },
  { province_code: '52', name: 'Tỉnh Gia Lai' },
  { province_code: '56', name: 'Tỉnh Khánh Hòa' },
  { province_code: '66', name: 'Tỉnh Đắk Lắk' },
  { province_code: '68', name: 'Tỉnh Lâm Đồng' },
  { province_code: '72', name: 'Tỉnh Tây Ninh' },
  { province_code: '82', name: 'Tỉnh Đồng Tháp' },
  { province_code: '86', name: 'Tỉnh Vĩnh Long' },
  { province_code: '91', name: 'Tỉnh An Giang' },
  { province_code: '96', name: 'Tỉnh Cà Mau' },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provinceCode = searchParams.get('province_code');

  try {
    if (provinceCode) {
      const res = await fetch(
        `https://34tinhthanh.com/api/wards?province_code=${encodeURIComponent(provinceCode)}`,
        { next: { revalidate: 86400 } }
      );
      if (!res.ok) throw new Error('Failed to fetch wards');
      const data = await res.json();
      return NextResponse.json(Array.isArray(data) ? data : []);
    } else {
      const res = await fetch('https://34tinhthanh.com/api/provinces', {
        next: { revalidate: 86400 },
      });
      if (!res.ok) throw new Error('Failed to fetch provinces');
      const data = await res.json();
      return NextResponse.json(Array.isArray(data) && data.length > 0 ? data : FALLBACK_PROVINCES);
    }
  } catch {
    if (provinceCode) {
      return NextResponse.json([]);
    }
    return NextResponse.json(FALLBACK_PROVINCES);
  }
}
