
document.addEventListener('DOMContentLoaded', () => {

  // Initialize signature pads
  const empCanvas = document.getElementById('employee-signature-pad');
  const empSignaturePad = empCanvas ? new SignaturePad(empCanvas) : null;

  const officerCanvas = document.getElementById('officer-signature-pad');
  const officerSignaturePad = officerCanvas ? new SignaturePad(officerCanvas) : null;

  // Resize canvases to fit container
  function resizeCanvas(canvas) {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.getContext('2d').setTransform(1, 0, 0, 1, 0, 0);
    canvas.getContext('2d').scale(ratio, ratio);
  }

  if (empCanvas) resizeCanvas(empCanvas);
  if (officerCanvas) resizeCanvas(officerCanvas);

  window.addEventListener('resize', () => {
    if (empCanvas) resizeCanvas(empCanvas);
    if (officerCanvas) resizeCanvas(officerCanvas);
  });

  // Data storage
  const attendanceRecords = [];
  let officerSignatureData = null;

  // Handle Employee Sign-In
  const employeeForm = document.getElementById('employee-form');
  if (employeeForm) {
    employeeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const empIdEl = document.getElementById('empId');
      const empbIdEl = document.getElementById('empbId');
      const empfNameEl = document.getElementById('empfName');
      const emplNameEl = document.getElementById('emplName');
      const empEmailEl = document.getElementById('empEmail');
      

      const empId = empIdEl ? empIdEl.value.trim() : '';
      const empbId = empbIdEl ? empbIdEl.value.trim() : '';
      const empfName = empfNameEl ? empfNameEl.value.trim() : '';
      const emplName = emplNameEl ? emplNameEl.value.trim() : '';
      const empEmail = empEmailEl ? empEmailEl.value.trim() : '';

      const signatureDataUrl = (empSignaturePad && !empSignaturePad.isEmpty()) ? empSignaturePad.toDataURL() : null;

      if (!signatureDataUrl) {
        alert('Please provide your signature.');
        return;
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString();

      const officerIdEl = document.getElementById('officerId');
      const officerNameEl = document.getElementById('officerName');
      const officerEmailEl = document.getElementById('officerEmail');

      const record = {
        empId,
        empbId,
        empfName,
        emplName,
        empEmail,
        signature: signatureDataUrl,
        date: dateStr,
        time: timeStr,
        officerId: officerIdEl ? officerIdEl.value.trim() : '',
        officerName: officerNameEl ? officerNameEl.value.trim() : '',
        officerEmail: officerEmailEl ? officerEmailEl.value.trim() : '',
        officerSignature: officerSignatureData
      };

      attendanceRecords.push(record);
      updateAttendanceTable();
      if (empSignaturePad) empSignaturePad.clear();

      alert('Attendance recorded successfully!');
    });
  }

  // Update attendance table
  function updateAttendanceTable() {
    const tbody = document.querySelector('#attendance-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    attendanceRecords.forEach(rec => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${rec.empId}</td>
        <td>${rec.empbId}</td>
        <td>${rec.empfName}</td>
        <td>${rec.emplName}</td>
        <td>${rec.empEmail}</td>
        <td>${rec.date}</td>
        <td>${rec.time}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Clear signature buttons
  const clearEmpBtn = document.getElementById('clear-emp-sign');
  if (clearEmpBtn) {
    clearEmpBtn.addEventListener('click', () => {
      if (empSignaturePad) empSignaturePad.clear();
    });
  }

  const clearOfficerBtn = document.getElementById('clear-officer-sign');
  if (clearOfficerBtn) {
    clearOfficerBtn.addEventListener('click', () => {
      if (officerSignaturePad) officerSignaturePad.clear();
    });
  }

  // Handle Officer Sign-Off
  const officerForm = document.getElementById('officer-form');
  if (officerForm) {
    officerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const officerSigUrl = (officerSignaturePad && !officerSignaturePad.isEmpty()) ? officerSignaturePad.toDataURL() : null;
      if (!officerSigUrl) {
        alert('Please provide instructor signature.');
        return;
      }
      officerSignatureData = officerSigUrl;
      alert('Instructor signature saved.');
    });
  }

  // Export to PDF
  const exportPdfBtn = document.getElementById('export-pdf');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      if (attendanceRecords.length === 0) {
        alert('No attendance records to export.');
        return;
      }
      if (typeof window.jspdf === 'undefined') {
        alert('jsPDF library is not loaded. Please include it in your HTML.');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFontSize(12);
      doc.text('Employee Attendance Report', 105, 20, null, null, 'center');
      // Table geometry (matches the columns used below)
      const colWidth = 40; // Adjusted column width to fit all columns
      const colCount = 7;
      const tableX = 10;
      const tableStartY = 30;
      const tableWidth = colCount * colWidth +20;

      // Draw thick top solid line and normal bottom line for header (these will be under the header text)
      const headerTopY = tableStartY - 6;
      const headerBottomY = tableStartY + 4;
      doc.setLineWidth(1);
      doc.setDrawColor(0, 0, 0);
      doc.line(tableX, headerTopY, tableX + tableWidth, headerTopY);
      doc.setLineWidth(0.25);
      doc.line(tableX, headerBottomY, tableX + tableWidth, headerBottomY);
      doc.setLineWidth(0.25);

      // Track table text Y positions so we can draw a final bottom line just before saving
      const originalText = doc.text.bind(doc);
      let tableMaxY = 0;
      doc.text = function(text, x, y, ...rest) {
        originalText(text, x, y, ...rest);
        if (typeof x === 'number' && typeof y === 'number') {
          // Only consider text within the table horizontal bounds and below the header start
          if (x >= tableX - 1 && x <= tableX + tableWidth + 1 && y >= tableStartY - 4) {
            tableMaxY = Math.max(tableMaxY, y);
          }
        }
      };

      // Monkey-patch save to draw the final bottom line at the end of the table just before saving
      const originalSave = doc.save.bind(doc);
      doc.save = function(filename) {
        const finalY = (tableMaxY ? tableMaxY + 6 : tableStartY + 10);
        doc.setLineWidth(0.7);
        doc.line(tableX, finalY, tableX + tableWidth, finalY);
        originalSave(filename);
      };
      const headers = ['Emp ID', 'Badge ID','First Name','Last Name','Email', 'Date', 'Time'];
      const data = attendanceRecords.map(r => [r.empId,r.empbId, r.empfName, r.emplName, r.empEmail, r.date, r.time]);

      // Add table (simple)
      let startY = 30;
      headers.forEach((h, i) => {
        doc.text(h, 10 + i * 45, startY);
      });
      startY += 10;
      data.forEach(row => {
        row.forEach((cell, i) => {
          doc.text(String(cell), 10 + i * 45, startY);
        });
        startY += 10;
      });

      // Add instructor signature if available
      if (officerSignatureData) {
        doc.addPage();
        doc.text('Instructor Signature:', 10, 20);
        try {
          const imgProps = doc.getImageProperties(officerSignatureData);
          const pdfWidth = 150;
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          doc.addImage(officerSignatureData, 'PNG', 10, 30, pdfWidth, pdfHeight);
        } catch (err) {
          console.warn('Failed to add instructor signature image to PDF', err);
        }
      }

      doc.save(`Attendance_Report_${new Date().toLocaleDateString()}.pdf`);
    });
  }

  // Export to Excel
  const exportExcelBtn = document.getElementById('export-excel');
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', () => {
      if (attendanceRecords.length === 0) {
        alert('No attendance records to export.');
        return;
      }
      const wb = XLSX.utils.book_new();
      const wsData = [];
      // Header row
      wsData.push(['Emp ID','Badge ID','First Name','Last Name','Email Address','Date','Time']);

      (function() {
        if (!XLSX || !XLSX.utils || !XLSX.utils.aoa_to_sheet) return;
        const originalAoaToSheet = XLSX.utils.aoa_to_sheet;
        XLSX.utils.aoa_to_sheet = function(aoa, opts) {
          const ws = originalAoaToSheet.call(this, aoa, opts);

          if (!ws['!ref']) return ws;
          const range = XLSX.utils.decode_range(ws['!ref']);
          const startCol = range.s.c;
          const endCol = range.e.c;
          const startRow = range.s.r;
          const endRow = range.e.r;

          // Apply header styles (row 0 in our data)
          const headerRowIndex = startRow; // header is at the first row of wsData
          for (let C = startCol; C <= endCol; ++C) {
            const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
            const cell = ws[addr];
            if (!cell) continue;
            cell.s = cell.s || {};
            cell.s.font = Object.assign({}, cell.s.font, { bold: true });
            cell.s.alignment = Object.assign({}, cell.s.alignment, { horizontal: 'center', vertical: 'center' });
            cell.s.border = Object.assign({}, cell.s.border, {
              top: { style: 'thick', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } }
            });
          }

          // Apply bottom line to the final data row
          const bottomRowIndex = endRow;
          for (let C = startCol; C <= endCol; ++C) {
            const addr = XLSX.utils.encode_cell({ r: bottomRowIndex, c: C });
            const cell = ws[addr];
            if (!cell) continue;
            cell.s = cell.s || {};
            cell.s.border = Object.assign({}, cell.s.border, {
              bottom: { style: 'thin', color: { rgb: '000000' } }
            });
          }

          // Set column widths (pixels) for a professional look
          const colCount = endCol - startCol + 1;
          const defaultWidths = [
            { wpx: 80 }, // Emp ID
            { wpx: 80 }, // Badge ID
            { wpx: 120 }, // First Name
            { wpx: 120 }, // Last Name
            { wpx: 140 }, // Email Address
            { wpx: 90 }, // Date
            { wpx: 70 }  // Time
          ];
          ws['!cols'] = [];
          for (let i = 0; i < colCount; i++) {
            ws['!cols'].push(defaultWidths[i] || { wpx: 100 });
          }

          return ws;
        };
      })();
      attendanceRecords.forEach(r => {
        wsData.push([r.empId,r.empbId, r.empfName, r.emplName, r.empEmail, r.date, r.time]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

      // Save file
      XLSX.writeFile(wb, `Attendance_Report_${new Date().toLocaleDateString()}.xlsx`);
    });
  }

});
