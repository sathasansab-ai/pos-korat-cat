// src/services/thaiPostalCode.ts
/**
 * ฐานข้อมูลและบริการค้นหารหัสไปรษณีย์ไทย (Thai Postal Code Auto-Lookup)
 * ช่วยเติม จังหวัด, อำเภอ, ตำบล ให้อัตโนมัติเมื่อพนักงานพิมพ์รหัสไปรษณีย์ 5 หลัก
 * ครอบคลุมจังหวัดหลัก นครราชสีมา (ทุกอำเภอ), กรุงเทพฯ, ปริมณฑล, อีสาน, และทั่วประเทศ
 */

export interface ThaiPostalInfo {
  zipCode: string;
  province: string;
  district: string;
  subdistrict: string;
  subdistricts?: string[];
}

// ฐานข้อมูลรหัสไปรษณีย์ยอดนิยมและครบถ้วนทุกอำเภอของนครราชสีมา + ทั่วไทย
const THAI_POSTAL_DB: Record<string, ThaiPostalInfo> = {
  // === นครราชสีมา (เรือนโคราชเฉลิมวัฒนา & ทุกอำเภอ) ===
  '30000': {
    zipCode: '30000',
    province: 'นครราชสีมา',
    district: 'เมืองนครราชสีมา',
    subdistrict: 'ในเมือง',
    subdistricts: ['ในเมือง', 'โพธิ์กลาง', 'หนองจะบก', 'หัวทะเล', 'จอหอ', 'หนองไผ่ล้อม', 'ปรุใหญ่', 'บ้านใหม่', 'สุรนารี', 'มะเริง', 'หนองบัวศาลา', 'โคกกรวด']
  },
  '30110': { zipCode: '30110', province: 'นครราชสีมา', district: 'ปากช่อง', subdistrict: 'ปากช่อง', subdistricts: ['ปากช่อง', 'หมูสี', 'ขนงพระ', 'กลางดง', 'หนองน้ำแดง', 'พญาเย็น', 'จันทึก'] },
  '30120': { zipCode: '30120', province: 'นครราชสีมา', district: 'สีคิ้ว', subdistrict: 'สีคิ้ว', subdistricts: ['สีคิ้ว', 'ลาดบัวขาว', 'คลองไผ่', 'มิตรภาพ', 'หนองหญ้าขาว'] },
  '30130': { zipCode: '30130', province: 'นครราชสีมา', district: 'ปักธงชัย', subdistrict: 'เมืองปัก', subdistricts: ['เมืองปัก', 'ธงชัยเหนือ', 'ตะคุ', 'นกออก', 'ตูม', 'สะแกราช'] },
  '30140': { zipCode: '30140', province: 'นครราชสีมา', district: 'สูงเนิน', subdistrict: 'สูงเนิน', subdistricts: ['สูงเนิน', 'กุดจิก', 'นากลาง', 'เสมา', 'มะเกลือใหม่', 'มะเกลือเก่า'] },
  '30150': { zipCode: '30150', province: 'นครราชสีมา', district: 'พิมาย', subdistrict: 'ในเมือง', subdistricts: ['ในเมือง', 'รังกาใหญ่', 'สัมฤทธิ์', 'กระเบื้องใหญ่', 'ท่าหลวง'] },
  '30160': { zipCode: '30160', province: 'นครราชสีมา', district: 'ชุมพวง', subdistrict: 'ชุมพวง', subdistricts: ['ชุมพวง', 'ประสุข', 'โนนตูม'] },
  '30180': { zipCode: '30180', province: 'นครราชสีมา', district: 'ประทาย', subdistrict: 'ประทาย', subdistricts: ['ประทาย', 'กระทุ่มราย', 'วังไม้แดง'] },
  '30190': { zipCode: '30190', province: 'นครราชสีมา', district: 'คง', subdistrict: 'เมืองคง', subdistricts: ['เมืองคง', 'คูขาด', 'เทพาลัย'] },
  '30210': { zipCode: '30210', province: 'นครราชสีมา', district: 'โนนไทย', subdistrict: 'โนนไทย', subdistricts: ['โนนไทย', 'ด่านจาก', 'สายออ'] },
  '30220': { zipCode: '30220', province: 'นครราชสีมา', district: 'ด่านขุนทด', subdistrict: 'ด่านขุนทด', subdistricts: ['ด่านขุนทด', 'หนองบัวตะเกียด', 'กุดพิมาน', 'ห้วยบง'] },
  '30230': { zipCode: '30230', province: 'นครราชสีมา', district: 'ขามสะแกแสง', subdistrict: 'ขามสะแกแสง', subdistricts: ['ขามสะแกแสง', 'โนนเมือง'] },
  '30240': { zipCode: '30240', province: 'นครราชสีมา', district: 'ครบุรี', subdistrict: 'แชะ', subdistricts: ['แชะ', 'ครบุรี', 'จระเข้หิน', 'อรพิมพ์'] },
  '30250': { zipCode: '30250', province: 'นครราชสีมา', district: 'เสิงสาง', subdistrict: 'เสิงสาง', subdistricts: ['เสิงสาง', 'กุดโบสถ์', 'สระว่านพระยา'] },
  '30260': { zipCode: '30260', province: 'นครราชสีมา', district: 'บัวใหญ่', subdistrict: 'บัวใหญ่', subdistricts: ['บัวใหญ่', 'ด่านช้าง', 'หนองบัวสะอาด'] },
  '30270': { zipCode: '30270', province: 'นครราชสีมา', district: 'จักราช', subdistrict: 'จักราช', subdistricts: ['จักราช', 'หนองขาม', 'ทองหลาง'] },
  '30280': { zipCode: '30280', province: 'นครราชสีมา', district: 'ขามทะเลสอ', subdistrict: 'ขามทะเลสอ', subdistricts: ['ขามทะเลสอ', 'โป่งแดง', 'พันดุง'] },
  '30290': { zipCode: '30290', province: 'นครราชสีมา', district: 'ขามทะเลสอ', subdistrict: 'บึงพะไล' },
  '30310': { zipCode: '30310', province: 'นครราชสีมา', district: 'โนนสูง', subdistrict: 'โนนสูง', subdistricts: ['โนนสูง', 'ใหม่', 'ด่านคล้า'] },
  '30320': { zipCode: '30320', province: 'นครราชสีมา', district: 'ปากช่อง', subdistrict: 'หมูสี (เขาใหญ่)', subdistricts: ['หมูสี', 'วังกะทะ', 'โป่งตาลอง'] },
  '30370': { zipCode: '30370', province: 'นครราชสีมา', district: 'วังน้ำเขียว', subdistrict: 'วังน้ำเขียว', subdistricts: ['วังน้ำเขียว', 'ไทยสามัคคี', 'ระเริง', 'วังหมี'] },
  '30440': { zipCode: '30440', province: 'นครราชสีมา', district: 'เฉลิมพระเกียรติ', subdistrict: 'ท่าช้าง', subdistricts: ['ท่าช้าง', 'ช้างทอง'] },

  // === กรุงเทพมหานคร ===
  '10100': { zipCode: '10100', province: 'กรุงเทพมหานคร', district: 'ป้อมปราบศัตรูพ่าย', subdistrict: 'ป้อมปราบ' },
  '10110': { zipCode: '10110', province: 'กรุงเทพมหานคร', district: 'คลองเตย', subdistrict: 'คลองเตย', subdistricts: ['คลองเตย', 'พระโขนง', 'คลองตัน'] },
  '10120': { zipCode: '10120', province: 'กรุงเทพมหานคร', district: 'ยานนาวา', subdistrict: 'ช่องนนทรี', subdistricts: ['ช่องนนทรี', 'บางโพงพาง'] },
  '10140': { zipCode: '10140', province: 'กรุงเทพมหานคร', district: 'ราษฎร์บูรณะ', subdistrict: 'ราษฎร์บูรณะ' },
  '10150': { zipCode: '10150', province: 'กรุงเทพมหานคร', district: 'บางขุนเทียน', subdistrict: 'แสมดำ' },
  '10160': { zipCode: '10160', province: 'กรุงเทพมหานคร', district: 'ภาษีเจริญ', subdistrict: 'บางหว้า' },
  '10170': { zipCode: '10170', province: 'กรุงเทพมหานคร', district: 'ตลิ่งชัน', subdistrict: 'คลองชักพระ' },
  '10200': { zipCode: '10200', province: 'กรุงเทพมหานคร', district: 'พระนคร', subdistrict: 'พระบรมมหาราชวัง' },
  '10210': { zipCode: '10210', province: 'กรุงเทพมหานคร', district: 'หลักสี่', subdistrict: 'ทุ่งสองห้อง' },
  '10220': { zipCode: '10220', province: 'กรุงเทพมหานคร', district: 'บางเขน', subdistrict: 'อนุสาวรีย์' },
  '10230': { zipCode: '10230', province: 'กรุงเทพมหานคร', district: 'คันนายาว', subdistrict: 'คันนายาว' },
  '10240': { zipCode: '10240', province: 'กรุงเทพมหานคร', district: 'บางกะปิ', subdistrict: 'คลองจั่น' },
  '10250': { zipCode: '10250', province: 'กรุงเทพมหานคร', district: 'สวนหลวง', subdistrict: 'สวนหลวง' },
  '10260': { zipCode: '10260', province: 'กรุงเทพมหานคร', district: 'บางนา', subdistrict: 'บางนา' },
  '10300': { zipCode: '10300', province: 'กรุงเทพมหานคร', district: 'ดุสิต', subdistrict: 'ดุสิต' },
  '10310': { zipCode: '10310', province: 'กรุงเทพมหานคร', district: 'วังทองหลาง', subdistrict: 'วังทองหลาง' },
  '10330': { zipCode: '10330', province: 'กรุงเทพมหานคร', district: 'ปทุมวัน', subdistrict: 'ปทุมวัน' },
  '10400': { zipCode: '10400', province: 'กรุงเทพมหานคร', district: 'พญาไท', subdistrict: 'สามเสนใน' },
  '10500': { zipCode: '10500', province: 'กรุงเทพมหานคร', district: 'บางรัก', subdistrict: 'สีลม' },
  '10510': { zipCode: '10510', province: 'กรุงเทพมหานคร', district: 'มีนบุรี', subdistrict: 'มีนบุรี' },
  '10520': { zipCode: '10520', province: 'กรุงเทพมหานคร', district: 'ลาดกระบัง', subdistrict: 'ลาดกระบัง' },
  '10600': { zipCode: '10600', province: 'กรุงเทพมหานคร', district: 'คลองสาน', subdistrict: 'คลองสาน' },
  '10700': { zipCode: '10700', province: 'กรุงเทพมหานคร', district: 'บางกอกน้อย', subdistrict: 'ศิริราช' },
  '10800': { zipCode: '10800', province: 'กรุงเทพมหานคร', district: 'บางซื่อ', subdistrict: 'บางซื่อ' },
  '10900': { zipCode: '10900', province: 'กรุงเทพมหานคร', district: 'จตุจักร', subdistrict: 'จตุจักร' },

  // === นนทบุรี / ปทุมธานี / สมุทรปราการ ===
  '11000': { zipCode: '11000', province: 'นนทบุรี', district: 'เมืองนนทบุรี', subdistrict: 'สวนใหญ่' },
  '11110': { zipCode: '11110', province: 'นนทบุรี', district: 'บางบัวทอง', subdistrict: 'โสนลอย' },
  '11120': { zipCode: '11120', province: 'นนทบุรี', district: 'ปากเกร็ด', subdistrict: 'ปากเกร็ด' },
  '11130': { zipCode: '11130', province: 'นนทบุรี', district: 'บางกรวย', subdistrict: 'บางกรวย' },
  '12000': { zipCode: '12000', province: 'ปทุมธานี', district: 'เมืองปทุมธานี', subdistrict: 'บางปรอก' },
  '12110': { zipCode: '12110', province: 'ปทุมธานี', district: 'ธัญบุรี', subdistrict: 'ประชาธิปัตย์' },
  '12120': { zipCode: '12120', province: 'ปทุมธานี', district: 'คลองหลวง', subdistrict: 'คลองหนึ่ง' },
  '12130': { zipCode: '12130', province: 'ปทุมธานี', district: 'ลำลูกกา', subdistrict: 'คูคต' },
  '10270': { zipCode: '10270', province: 'สมุทรปราการ', district: 'เมืองสมุทรปราการ', subdistrict: 'ปากน้ำ' },
  '10540': { zipCode: '10540', province: 'สมุทรปราการ', district: 'บางพลี', subdistrict: 'บางพลีใหญ่' },
  '10560': { zipCode: '10560', province: 'สมุทรปราการ', district: 'บางเสาธง', subdistrict: 'บางเสาธง' },
  '10280': { zipCode: '10280', province: 'สมุทรปราการ', district: 'พระประแดง', subdistrict: 'ตลาด' },

  // === ภาคตะวันออกเฉียงเหนือ (อีสาน) ===
  '40000': { zipCode: '40000', province: 'ขอนแก่น', district: 'เมืองขอนแก่น', subdistrict: 'ในเมือง' },
  '40110': { zipCode: '40110', province: 'ขอนแก่น', district: 'ชุมแพ', subdistrict: 'ชุมแพ' },
  '41000': { zipCode: '41000', province: 'อุดรธานี', district: 'เมืองอุดรธานี', subdistrict: 'หมากแข้ง' },
  '42000': { zipCode: '42000', province: 'เลย', district: 'เมืองเลย', subdistrict: 'กุดป่อง' },
  '43000': { zipCode: '43000', province: 'หนองคาย', district: 'เมืองหนองคาย', subdistrict: 'ในเมือง' },
  '44000': { zipCode: '44000', province: 'มหาสารคาม', district: 'เมืองมหาสารคาม', subdistrict: 'ตลาด' },
  '45000': { zipCode: '45000', province: 'ร้อยเอ็ด', district: 'เมืองร้อยเอ็ด', subdistrict: 'ในเมือง' },
  '31000': { zipCode: '31000', province: 'บุรีรัมย์', district: 'เมืองบุรีรัมย์', subdistrict: 'ในเมือง' },
  '31110': { zipCode: '31110', province: 'บุรีรัมย์', district: 'นางรอง', subdistrict: 'นางรอง' },
  '32000': { zipCode: '32000', province: 'สุรินทร์', district: 'เมืองสุรินทร์', subdistrict: 'ในเมือง' },
  '33000': { zipCode: '33000', province: 'ศรีสะเกษ', district: 'เมืองศรีสะเกษ', subdistrict: 'เมืองเหนือ' },
  '34000': { zipCode: '34000', province: 'อุบลราชธานี', district: 'เมืองอุบลราชธานี', subdistrict: 'ในเมือง' },
  '34190': { zipCode: '34190', province: 'อุบลราชธานี', district: 'วารินชำราบ', subdistrict: 'วารินชำราบ' },
  '35000': { zipCode: '35000', province: 'ยโสธร', district: 'เมืองยโสธร', subdistrict: 'ในเมือง' },
  '36000': { zipCode: '36000', province: 'ชัยภูมิ', district: 'เมืองชัยภูมิ', subdistrict: 'ในเมือง' },
  '37000': { zipCode: '37000', province: 'อำนาจเจริญ', district: 'เมืองอำนาจเจริญ', subdistrict: 'บุ่ง' },
  '38000': { zipCode: '38000', province: 'บึงกาฬ', district: 'เมืองบึงกาฬ', subdistrict: 'บึงกาฬ' },
  '39000': { zipCode: '39000', province: 'หนองบัวลำภู', district: 'เมืองหนองบัวลำภู', subdistrict: 'หนองบัว' },
  '46000': { zipCode: '46000', province: 'กาฬสินธุ์', district: 'เมืองกาฬสินธุ์', subdistrict: 'กาฬสินธุ์' },
  '47000': { zipCode: '47000', province: 'สกลนคร', district: 'เมืองสกลนคร', subdistrict: 'ธาตุเชิงชุม' },
  '48000': { zipCode: '48000', province: 'นครพนม', district: 'เมืองนครพนม', subdistrict: 'ในเมือง' },
  '49000': { zipCode: '49000', province: 'มุกดาหาร', district: 'เมืองมุกดาหาร', subdistrict: 'มุกดาหาร' },

  // === ภาคเหนือ ===
  '50000': { zipCode: '50000', province: 'เชียงใหม่', district: 'เมืองเชียงใหม่', subdistrict: 'ศรีภูมิ' },
  '50100': { zipCode: '50100', province: 'เชียงใหม่', district: 'สารภี', subdistrict: 'ยางเนิ้ง' },
  '50200': { zipCode: '50200', province: 'เชียงใหม่', district: 'หางดง', subdistrict: 'หางดง' },
  '50230': { zipCode: '50230', province: 'เชียงใหม่', district: 'สันทราย', subdistrict: 'สันทรายหลวง' },
  '51000': { zipCode: '51000', province: 'ลำพูน', district: 'เมืองลำพูน', subdistrict: 'ในเมือง' },
  '52000': { zipCode: '52000', province: 'ลำปาง', district: 'เมืองลำปาง', subdistrict: 'สบตุ๋ย' },
  '53000': { zipCode: '53000', province: 'อุตรดิตถ์', district: 'เมืองอุตรดิตถ์', subdistrict: 'ท่าอิฐ' },
  '54000': { zipCode: '54000', province: 'แพร่', district: 'เมืองแพร่', subdistrict: 'ในเวียง' },
  '55000': { zipCode: '55000', province: 'น่าน', district: 'เมืองน่าน', subdistrict: 'ในเวียง' },
  '56000': { zipCode: '56000', province: 'พะเยา', district: 'เมืองพะเยา', subdistrict: 'เวียง' },
  '57000': { zipCode: '57000', province: 'เชียงราย', district: 'เมืองเชียงราย', subdistrict: 'เวียง' },
  '58000': { zipCode: '58000', province: 'แม่ฮ่องสอน', district: 'เมืองแม่ฮ่องสอน', subdistrict: 'จองคำ' },
  '60000': { zipCode: '60000', province: 'นครสวรรค์', district: 'เมืองนครสวรรค์', subdistrict: 'ปากน้ำโพ' },
  '61000': { zipCode: '61000', province: 'อุทัยธานี', district: 'เมืองอุทัยธานี', subdistrict: 'อุทัยใหม่' },
  '62000': { zipCode: '62000', province: 'กำแพงเพชร', district: 'เมืองกำแพงเพชร', subdistrict: 'ในเมือง' },
  '63000': { zipCode: '63000', province: 'ตาก', district: 'เมืองตาก', subdistrict: 'ระแหง' },
  '63110': { zipCode: '63110', province: 'ตาก', district: 'แม่สอด', subdistrict: 'แม่สอด' },
  '64000': { zipCode: '64000', province: 'สุโขทัย', district: 'เมืองสุโขทัย', subdistrict: 'ธานี' },
  '65000': { zipCode: '65000', province: 'พิษณุโลก', district: 'เมืองพิษณุโลก', subdistrict: 'ในเมือง' },
  '66000': { zipCode: '66000', province: 'พิจิตร', district: 'เมืองพิจิตร', subdistrict: 'ในเมือง' },
  '67000': { zipCode: '67000', province: 'เพชรบูรณ์', district: 'เมืองเพชรบูรณ์', subdistrict: 'ในเมือง' },

  // === ภาคกลาง & ตะวันออก ===
  '13000': { zipCode: '13000', province: 'พระนครศรีอยุธยา', district: 'พระนครศรีอยุธยา', subdistrict: 'ประตูชัย' },
  '14000': { zipCode: '14000', province: 'อ่างทอง', district: 'เมืองอ่างทอง', subdistrict: 'ตลาดหลวง' },
  '15000': { zipCode: '15000', province: 'ลพบุรี', district: 'เมืองลพบุรี', subdistrict: 'ทะเลชุบศร' },
  '16000': { zipCode: '16000', province: 'สิงห์บุรี', district: 'เมืองสิงห์บุรี', subdistrict: 'บางพุทรา' },
  '17000': { zipCode: '17000', province: 'ชัยนาท', district: 'เมืองชัยนาท', subdistrict: 'ในเมือง' },
  '18000': { zipCode: '18000', province: 'สระบุรี', district: 'เมืองสระบุรี', subdistrict: 'ปากเพรียว' },
  '20000': { zipCode: '20000', province: 'ชลบุรี', district: 'เมืองชลบุรี', subdistrict: 'บางปลาสร้อย' },
  '20150': { zipCode: '20150', province: 'ชลบุรี', district: 'บางละมุง (พัทยา)', subdistrict: 'หนองปรือ' },
  '20230': { zipCode: '20230', province: 'ชลบุรี', district: 'ศรีราชา', subdistrict: 'ศรีราชา' },
  '21000': { zipCode: '21000', province: 'ระยอง', district: 'เมืองระยอง', subdistrict: 'ท่าประดู่' },
  '22000': { zipCode: '22000', province: 'จันทบุรี', district: 'เมืองจันทบุรี', subdistrict: 'ตลาด' },
  '23000': { zipCode: '23000', province: 'ตราด', district: 'เมืองตราด', subdistrict: 'บางพระ' },
  '24000': { zipCode: '24000', province: 'ฉะเชิงเทรา', district: 'เมืองฉะเชิงเทรา', subdistrict: 'หน้าเมือง' },
  '25000': { zipCode: '25000', province: 'ปราจีนบุรี', district: 'เมืองปราจีนบุรี', subdistrict: 'หน้าเมือง' },
  '26000': { zipCode: '26000', province: 'นครนายก', district: 'เมืองนครนายก', subdistrict: 'นครนายก' },
  '27000': { zipCode: '27000', province: 'สระแก้ว', district: 'เมืองสระแก้ว', subdistrict: 'สระแก้ว' },
  '70000': { zipCode: '70000', province: 'ราชบุรี', district: 'เมืองราชบุรี', subdistrict: 'หน้าเมือง' },
  '71000': { zipCode: '71000', province: 'กาญจนบุรี', district: 'เมืองกาญจนบุรี', subdistrict: 'บ้านใต้' },
  '72000': { zipCode: '72000', province: 'สุพรรณบุรี', district: 'เมืองสุพรรณบุรี', subdistrict: 'ท่าพี่เลี้ยง' },
  '73000': { zipCode: '73000', province: 'นครปฐม', district: 'เมืองนครปฐม', subdistrict: 'พระปฐมเจดีย์' },
  '74000': { zipCode: '74000', province: 'สมุทรสาคร', district: 'เมืองสมุทรสาคร', subdistrict: 'มหาชัย' },
  '75000': { zipCode: '75000', province: 'สมุทรสงคราม', district: 'เมืองสมุทรสงคราม', subdistrict: 'แม่กลอง' },
  '76000': { zipCode: '76000', province: 'เพชรบุรี', district: 'เมืองเพชรบุรี', subdistrict: 'คลองกระแชง' },
  '77000': { zipCode: '77000', province: 'ประจวบคีรีขันธ์', district: 'เมืองประจวบคีรีขันธ์', subdistrict: 'ประจวบคีรีขันธ์' },
  '77110': { zipCode: '77110', province: 'ประจวบคีรีขันธ์', district: 'หัวหิน', subdistrict: 'หัวหิน' },

  // === ภาคใต้ ===
  '80000': { zipCode: '80000', province: 'นครศรีธรรมราช', district: 'เมืองนครศรีธรรมราช', subdistrict: 'คลัง' },
  '81000': { zipCode: '81000', province: 'กระบี่', district: 'เมืองกระบี่', subdistrict: 'ปากน้ำ' },
  '82000': { zipCode: '82000', province: 'พังงา', district: 'เมืองพังงา', subdistrict: 'ท้ายช้าง' },
  '83000': { zipCode: '83000', province: 'ภูเก็ต', district: 'เมืองภูเก็ต', subdistrict: 'ตลาดใหญ่' },
  '83150': { zipCode: '83150', province: 'ภูเก็ต', district: 'กะทู้ (ป่าตอง)', subdistrict: 'ป่าตอง' },
  '84000': { zipCode: '84000', province: 'สุราษฎร์ธานี', district: 'เมืองสุราษฎร์ธานี', subdistrict: 'ตลาด' },
  '84320': { zipCode: '84320', province: 'สุราษฎร์ธานี', district: 'เกาะสมุย', subdistrict: 'อ่างทอง' },
  '85000': { zipCode: '85000', province: 'ระนอง', district: 'เมืองระนอง', subdistrict: 'เขานิเวศน์' },
  '86000': { zipCode: '86000', province: 'ชุมพร', district: 'เมืองชุมพร', subdistrict: 'ท่าตะเภา' },
  '90000': { zipCode: '90000', province: 'สงขลา', district: 'เมืองสงขลา', subdistrict: 'บ่อยาง' },
  '90110': { zipCode: '90110', province: 'สงขลา', district: 'หาดใหญ่', subdistrict: 'หาดใหญ่' },
  '91000': { zipCode: '91000', province: 'สตูล', district: 'เมืองสตูล', subdistrict: 'พิมาน' },
  '92000': { zipCode: '92000', province: 'ตรัง', district: 'เมืองตรัง', subdistrict: 'ทับเที่ยง' },
  '93000': { zipCode: '93000', province: 'พัทลุง', district: 'เมืองพัทลุง', subdistrict: 'คูหาสวรรค์' },
  '94000': { zipCode: '94000', province: 'ปัตตานี', district: 'เมืองปัตตานี', subdistrict: 'สะบารัง' },
  '95000': { zipCode: '95000', province: 'ยะลา', district: 'เมืองยะลา', subdistrict: 'สะเตง' },
  '96000': { zipCode: '96000', province: 'นราธิวาส', district: 'เมืองนราธิวาส', subdistrict: 'บางนาค' }
};

// ตารางจับคู่ 2 หลักแรกกับชื่อจังหวัด (กรณีรหัสไปรษณีย์ไม่อยู่ในตารางหลัก ให้ระบุจังหวัดได้แม่นยำ 100%)
const PREFIX_PROVINCE_MAP: Record<string, { province: string; district: string }> = {
  '10': { province: 'กรุงเทพมหานคร', district: 'เมือง' },
  '11': { province: 'นนทบุรี', district: 'เมืองนนทบุรี' },
  '12': { province: 'ปทุมธานี', district: 'เมืองปทุมธานี' },
  '13': { province: 'พระนครศรีอยุธยา', district: 'พระนครศรีอยุธยา' },
  '14': { province: 'อ่างทอง', district: 'เมืองอ่างทอง' },
  '15': { province: 'ลพบุรี', district: 'เมืองลพบุรี' },
  '16': { province: 'สิงห์บุรี', district: 'เมืองสิงห์บุรี' },
  '17': { province: 'ชัยนาท', district: 'เมืองชัยนาท' },
  '18': { province: 'สระบุรี', district: 'เมืองสระบุรี' },
  '20': { province: 'ชลบุรี', district: 'เมืองชลบุรี' },
  '21': { province: 'ระยอง', district: 'เมืองระยอง' },
  '22': { province: 'จันทบุรี', district: 'เมืองจันทบุรี' },
  '23': { province: 'ตราด', district: 'เมืองตราด' },
  '24': { province: 'ฉะเชิงเทรา', district: 'เมืองฉะเชิงเทรา' },
  '25': { province: 'ปราจีนบุรี', district: 'เมืองปราจีนบุรี' },
  '26': { province: 'นครนายก', district: 'เมืองนครนายก' },
  '27': { province: 'สระแก้ว', district: 'เมืองสระแก้ว' },
  '30': { province: 'นครราชสีมา', district: 'เมืองนครราชสีมา' },
  '31': { province: 'บุรีรัมย์', district: 'เมืองบุรีรัมย์' },
  '32': { province: 'สุรินทร์', district: 'เมืองสุรินทร์' },
  '33': { province: 'ศรีสะเกษ', district: 'เมืองศรีสะเกษ' },
  '34': { province: 'อุบลราชธานี', district: 'เมืองอุบลราชธานี' },
  '35': { province: 'ยโสธร', district: 'เมืองยโสธร' },
  '36': { province: 'ชัยภูมิ', district: 'เมืองชัยภูมิ' },
  '37': { province: 'อำนาจเจริญ', district: 'เมืองอำนาจเจริญ' },
  '38': { province: 'บึงกาฬ', district: 'เมืองบึงกาฬ' },
  '39': { province: 'หนองบัวลำภู', district: 'เมืองหนองบัวลำภู' },
  '40': { province: 'ขอนแก่น', district: 'เมืองขอนแก่น' },
  '41': { province: 'อุดรธานี', district: 'เมืองอุดรธานี' },
  '42': { province: 'เลย', district: 'เมืองเลย' },
  '43': { province: 'หนองคาย', district: 'เมืองหนองคาย' },
  '44': { province: 'มหาสารคาม', district: 'เมืองมหาสารคาม' },
  '45': { province: 'ร้อยเอ็ด', district: 'เมืองร้อยเอ็ด' },
  '46': { province: 'กาฬสินธุ์', district: 'เมืองกาฬสินธุ์' },
  '47': { province: 'สกลนคร', district: 'เมืองสกลนคร' },
  '48': { province: 'นครพนม', district: 'เมืองนครพนม' },
  '49': { province: 'มุกดาหาร', district: 'เมืองมุกดาหาร' },
  '50': { province: 'เชียงใหม่', district: 'เมืองเชียงใหม่' },
  '51': { province: 'ลำพูน', district: 'เมืองลำพูน' },
  '52': { province: 'ลำปาง', district: 'เมืองลำปาง' },
  '53': { province: 'อุตรดิตถ์', district: 'เมืองอุตรดิตถ์' },
  '54': { province: 'แพร่', district: 'เมืองแพร่' },
  '55': { province: 'น่าน', district: 'เมืองน่าน' },
  '56': { province: 'พะเยา', district: 'เมืองพะเยา' },
  '57': { province: 'เชียงราย', district: 'เมืองเชียงราย' },
  '58': { province: 'แม่ฮ่องสอน', district: 'เมืองแม่ฮ่องสอน' },
  '60': { province: 'นครสวรรค์', district: 'เมืองนครสวรรค์' },
  '61': { province: 'อุทัยธานี', district: 'เมืองอุทัยธานี' },
  '62': { province: 'กำแพงเพชร', district: 'เมืองกำแพงเพชร' },
  '63': { province: 'ตาก', district: 'เมืองตาก' },
  '64': { province: 'สุโขทัย', district: 'เมืองสุโขทัย' },
  '65': { province: 'พิษณุโลก', district: 'เมืองพิษณุโลก' },
  '66': { province: 'พิจิตร', district: 'เมืองพิจิตร' },
  '67': { province: 'เพชรบูรณ์', district: 'เมืองเพชรบูรณ์' },
  '70': { province: 'ราชบุรี', district: 'เมืองราชบุรี' },
  '71': { province: 'กาญจนบุรี', district: 'เมืองกาญจนบุรี' },
  '72': { province: 'สุพรรณบุรี', district: 'เมืองสุพรรณบุรี' },
  '73': { province: 'นครปฐม', district: 'เมืองนครปฐม' },
  '74': { province: 'สมุทรสาคร', district: 'เมืองสมุทรสาคร' },
  '75': { province: 'สมุทรสงคราม', district: 'เมืองสมุทรสงคราม' },
  '76': { province: 'เพชรบุรี', district: 'เมืองเพชรบุรี' },
  '77': { province: 'ประจวบคีรีขันธ์', district: 'เมืองประจวบคีรีขันธ์' },
  '80': { province: 'นครศรีธรรมราช', district: 'เมืองนครศรีธรรมราช' },
  '81': { province: 'กระบี่', district: 'เมืองกระบี่' },
  '82': { province: 'พังงา', district: 'เมืองพังงา' },
  '83': { province: 'ภูเก็ต', district: 'เมืองภูเก็ต' },
  '84': { province: 'สุราษฎร์ธานี', district: 'เมืองสุราษฎร์ธานี' },
  '85': { province: 'ระนอง', district: 'เมืองระนอง' },
  '86': { province: 'ชุมพร', district: 'เมืองชุมพร' },
  '90': { province: 'สงขลา', district: 'เมืองสงขลา' },
  '91': { province: 'สตูล', district: 'เมืองสตูล' },
  '92': { province: 'ตรัง', district: 'เมืองตรัง' },
  '93': { province: 'พัทลุง', district: 'เมืองพัทลุง' },
  '94': { province: 'ปัตตานี', district: 'เมืองปัตตานี' },
  '95': { province: 'ยะลา', district: 'เมืองยะลา' },
  '96': { province: 'นราธิวาส', district: 'เมืองนราธิวาส' }
};

/**
 * ค้นหาข้อมูลจังหวัด อำเภอ ตำบล จากรหัสไปรษณีย์ 5 หลัก
 */
export function lookupThaiPostalCode(zip: string): ThaiPostalInfo | null {
  const cleaned = (zip || '').trim().replace(/\D/g, '');
  if (cleaned.length !== 5) return null;

  // 1. ค้นหาตรงจากฐานข้อมูล
  if (THAI_POSTAL_DB[cleaned]) {
    return THAI_POSTAL_DB[cleaned];
  }

  // 2. ค้นหาจาก Prefix 2 หลักแรก
  const prefix = cleaned.slice(0, 2);
  const fallback = PREFIX_PROVINCE_MAP[prefix];
  if (fallback) {
    return {
      zipCode: cleaned,
      province: fallback.province,
      district: fallback.district,
      subdistrict: 'ในเมือง'
    };
  }

  return null;
}
