import React, { useState } from 'react';

const EmployeeTable = ({ data, onSelectEmployee, onDeleteEmployee }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  if (!data || data.length === 0) {
    return (
      <div className="glass-panel text-center" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>🔍 ไม่พบข้อมูลที่ค้นหา</p>
        <p style={{ fontSize: '0.9rem' }}>กรุณาลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่อีกครั้ง</p>
      </div>
    );
  }

  // Calculate pagination details
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Function to render remaining vacation days indicator
  const renderVacationProgress = (remaining) => {
    const totalVacationLimit = 30; // Max allowed vacation days
    const percentage = Math.min((remaining / totalVacationLimit) * 100, 100);
    let color = 'var(--green)';
    if (percentage < 30) color = 'var(--red)';
    else if (percentage < 60) color = 'var(--yellow)';

    return (
      <div style={{ width: '100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px' }}>
          <span>{remaining} วัน</span>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${percentage}%`, background: color }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '0px', overflow: 'hidden' }}>
      <div className="table-wrapper">
        <table className="employee-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>ลำดับ</th>
              <th>ชื่อ - นามสกุล</th>
              <th>ตำแหน่ง</th>
              <th>สถานที่ปฏิบัติราชการ</th>
              <th style={{ width: '90px', textAlign: 'center' }}>ลาป่วย (วัน)</th>
              <th style={{ width: '130px' }}>พักผ่อนคงเหลือ</th>
              <th style={{ width: '90px', textAlign: 'center' }}>ขาด (วัน)</th>
              <th style={{ width: '90px', textAlign: 'center' }}>สาย (ครั้ง)</th>
              <th style={{ width: '80px', textAlign: 'center' }}>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((employee) => (
              <tr key={employee.id} onClick={() => onSelectEmployee(employee)}>
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>{indexOfFirstItem + currentItems.indexOf(employee) + 1}</td>
                <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                  {employee.name}
                </td>
                <td>
                  <span className={`badge ${
                    employee.position.includes('ผู้อำนวยการ') ? 'badge-primary' :
                    employee.position.includes('ครูผู้ช่วย') ? 'badge-green' :
                    employee.position.includes('ครู') ? 'badge-cyan' :
                    employee.position.includes('พนักงานราชการ') ? 'badge-yellow' : 'badge-primary'
                  }`}>
                    {employee.position}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {employee.location && employee.location.trim() ? employee.location : 'ศูนย์การศึกษาพิเศษประจำจังหวัดปทุมธานี'}
                  </div>
                </td>
                <td style={{ textAlign: 'center', color: employee.leaves.sick.days > 0 ? 'var(--cyan)' : 'var(--text-muted)' }}>
                  {employee.leaves.sick.days.toFixed(1)}
                </td>
                <td>
                  {renderVacationProgress(employee.leaves.vacation.remaining)}
                </td>
                <td style={{ textAlign: 'center', color: employee.leaves.absent > 0 ? 'var(--red)' : 'var(--text-muted)', fontWeight: employee.leaves.absent > 0 ? '600' : 'normal' }}>
                  {employee.leaves.absent}
                </td>
                <td style={{ textAlign: 'center', color: employee.leaves.late.count > 0 ? 'var(--yellow)' : 'var(--text-muted)' }}>
                  {employee.leaves.late.count}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEmployee(employee.id);
                    }}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: 'var(--red)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 'bold'
                    }}
                  >
                    🗑️ ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            แสดง {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, data.length)} จากทั้งหมด {data.length} คน
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '8px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
                fontSize: '0.85rem'
              }}
            >
              ย้อนกลับ
            </button>
            
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isPageActive = pageNum === currentPage;
              
              // Only render standard subset of page buttons if too many
              if (totalPages > 6 && Math.abs(pageNum - currentPage) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                if (pageNum === 2 || pageNum === totalPages - 1) {
                  return <span key={idx} style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>...</span>;
                }
                return null;
              }

              return (
                <button
                  key={idx}
                  onClick={() => handlePageChange(pageNum)}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: isPageActive ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                    border: isPageActive ? 'none' : '1px solid var(--border-color)',
                    color: '#fff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: isPageActive ? '700' : '400',
                    boxShadow: isPageActive ? '0 0 10px var(--primary-glow)' : 'none',
                    fontSize: '0.85rem'
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '8px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1,
                fontSize: '0.85rem'
              }}
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTable;
