import React from 'react';

const Filters = ({
  searchQuery,
  setSearchQuery,
  selectedPosition,
  setSelectedPosition,
  selectedLocation,
  setSelectedLocation,
  positionsList,
  locationsList,
  sortBy,
  setSortBy,
  onClear
}) => {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Search Input */}
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="ค้นหาชื่อ - นามสกุล..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Position Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <select
            className="select-input"
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
          >
            <option value="">ทุกตำแหน่ง</option>
            {positionsList.map((pos, idx) => (
              <option key={idx} value={pos}>{pos}</option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <select
            className="select-input"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">ทุกสถานที่ปฏิบัติงาน</option>
            {locationsList.map((loc, idx) => (
              <option key={idx} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <select
            className="select-input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="id">เรียงตามลำดับรายชื่อ</option>
            <option value="sick-desc">ลาป่วยสูงสุด</option>
            <option value="vacation-desc">ลาพักผ่อนสูงสุด</option>
            <option value="personal-desc">ลากิจสูงสุด</option>
            <option value="absent-desc">ขาดราชการสูงสุด</option>
            <option value="late-desc">มาสายสูงสุด</option>
            <option value="total-desc">รวมวันลาทั้งหมดสูงสุด</option>
          </select>
        </div>

        {/* Clear Filter Button */}
        {(searchQuery || selectedPosition || selectedLocation || sortBy !== 'id') && (
          <button
            onClick={onClear}
            style={{
              padding: '12px 18px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--red)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'var(--transition-smooth)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.12)';
            }}
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>
    </div>
  );
};

export default Filters;
