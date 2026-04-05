'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChevronDown, MapPin } from 'lucide-react';

interface Region {
  id: string;
  name: string;
  level: string;
  parent_id: string | null;
}

interface RegionFilterProps {
  selectedProvince: string;
  selectedCity: string;
  selectedDistrict: string;
  onProvinceChange: (val: string) => void;
  onCityChange: (val: string) => void;
  onDistrictChange: (val: string) => void;
}

const selectStyle = {
  width: '100%',
  padding: '8px 28px 8px 28px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-primary)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: '0.75rem',
  appearance: 'none' as const,
  cursor: 'pointer',
};

const disabledSelectStyle = {
  ...selectStyle,
  opacity: 0.45,
  cursor: 'not-allowed' as const,
};

export default function RegionFilter({
  selectedProvince, selectedCity, selectedDistrict,
  onProvinceChange, onCityChange, onDistrictChange,
}: RegionFilterProps) {
  const supabase = createClient();
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);

  // Load provinces once
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('regions')
        .select('id, name, level, parent_id')
        .eq('level', 'provinsi')
        .order('name');
      setProvinces(data || []);
    };
    fetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load cities when province changes
  useEffect(() => {
    if (!selectedProvince) { setCities([]); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from('regions')
        .select('id, name, level, parent_id')
        .eq('level', 'kabupaten')
        .eq('parent_id', selectedProvince)
        .order('name');
      setCities(data || []);
    };
    fetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvince]);

  // Load districts (kecamatan) when city changes
  useEffect(() => {
    if (!selectedCity) { setDistricts([]); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from('regions')
        .select('id, name, level, parent_id')
        .eq('level', 'kecamatan')
        .eq('parent_id', selectedCity)
        .order('name');
      setDistricts(data || []);
    };
    fetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {/* Province */}
      <div style={{ position: 'relative', flex: '1 1 130px' }}>
        <MapPin size={12} color="var(--text-muted)" style={{
          position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 1,
        }} />
        <select
          value={selectedProvince}
          onChange={(e) => {
            onProvinceChange(e.target.value);
            onCityChange('');
            onDistrictChange('');
          }}
          style={selectStyle}
        >
          <option value="">Semua Provinsi</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <ChevronDown size={12} color="var(--text-muted)" style={{
          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* City */}
      <div style={{ position: 'relative', flex: '1 1 130px' }}>
        <select
          value={selectedCity}
          onChange={(e) => { onCityChange(e.target.value); onDistrictChange(''); }}
          disabled={!selectedProvince}
          style={selectedProvince ? selectStyle : disabledSelectStyle}
        >
          <option value="">Semua Kota/Kab</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <ChevronDown size={12} color="var(--text-muted)" style={{
          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* District (Kecamatan) */}
      <div style={{ position: 'relative', flex: '1 1 130px' }}>
        <select
          value={selectedDistrict}
          onChange={(e) => onDistrictChange(e.target.value)}
          disabled={!selectedCity || districts.length === 0}
          style={(selectedCity && districts.length > 0) ? selectStyle : disabledSelectStyle}
        >
          <option value="">Semua Kecamatan</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <ChevronDown size={12} color="var(--text-muted)" style={{
          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}
