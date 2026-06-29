# Party Split - GitHub Pages + Google Sheet

เวอร์ชันนี้ออกแบบให้ผู้ใช้เปิดใช้งานผ่าน GitHub Pages เป็นช่องทางหลักเพียงช่องทางเดียว ส่วน Google Apps Script ทำหน้าที่เป็น API หลังบ้านสำหรับอ่าน/บันทึกข้อมูลลง Google Sheet

## ไฟล์หลัก

- `index.html` - หน้าเว็บที่นำขึ้น GitHub Pages
- `Code.gs` - Backend API สำหรับ Google Apps Script
- `README_TH.md` - คู่มือการติดตั้ง

## โครงสร้างการทำงาน

1. ผู้ใช้เปิดหน้าเว็บจาก GitHub Pages
2. `index.html` เรียก Apps Script Web App URL ผ่าน JSONP API
3. `Code.gs` อ่าน/บันทึกข้อมูลลง Google Sheet ชื่อ `Party Split Database`
4. ทุกเครื่องที่เปิด GitHub Pages URL เดียวกันจะเห็นข้อมูลชุดเดียวกัน

## ขั้นตอนติดตั้ง Apps Script Backend

1. เข้า https://script.google.com
2. สร้าง New project
3. วางโค้ดจาก `Code.gs` ลงในไฟล์ `Code.gs`
4. กด Save
5. เลือกฟังก์ชัน `setupDatabase` แล้วกด Run หนึ่งครั้ง
6. อนุญาตสิทธิ์ตามที่ Google แจ้ง
7. ไปที่ Deploy > New deployment
8. เลือก Type เป็น Web app
9. ตั้งค่า:
   - Execute as: Me
   - Who has access: Anyone
10. กด Deploy และคัดลอก Web app URL

## ตั้งค่า GitHub Pages

1. เปิดไฟล์ `index.html`
2. ตรวจค่า `WEB_APP_URL` ให้เป็น Web app URL ล่าสุด เช่น:

```js
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxpDyLwnQVfwq7NwWmBZsvrOrA1DbUqgQ_2Kmq0p5wDtZIc7rVAL5VtRqXZ97j3zcQY/exec";
```

3. อัปโหลดไฟล์ขึ้น GitHub repository
4. ไฟล์หน้าเว็บหลักคือ `index.html` ซึ่ง GitHub Pages ใช้เป็นหน้าแรกอัตโนมัติ
5. ไปที่ Settings > Pages
6. เลือก Deploy from a branch
7. เลือก branch และ folder ที่เก็บไฟล์
8. เปิด GitHub Pages URL เพื่อใช้งานจริง

## หมายเหตุสำคัญ

- ผู้ใช้ควรเปิดผ่าน GitHub Pages URL เป็นหลัก
- Apps Script URL ยังต้องมีอยู่ แต่ใช้เป็น backend API เท่านั้น
- หลังแก้ `Code.gs` ต้อง Deploy เป็น New version ทุกครั้ง
- หลังแก้ `index.html` ต้อง push หรืออัปโหลดขึ้น GitHub ใหม่
- รหัสล้างข้อมูลทั้งหมดคือ `Admin1234`
- ข้อมูลหลักอยู่ใน Google Sheet tab `PartySplitDB`
- ประวัติ Save / Clear อยู่ใน Google Sheet tab `ActivityLog`

## ทดสอบหลัง Deploy

1. เปิด GitHub Pages URL
2. สถานะด้านบนควรขึ้นว่าเชื่อมต่อ Google Sheet แล้ว
3. เพิ่มรายชื่อและค่าใช้จ่าย
4. Refresh หน้าเว็บ ข้อมูลต้องยังอยู่
5. เปิด URL เดียวกันจากมือถือ ข้อมูลต้องตรงกัน