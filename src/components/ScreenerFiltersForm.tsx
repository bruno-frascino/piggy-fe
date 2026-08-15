'use client';

import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { useState } from 'react';
import {
  useCreateSavedScreen,
  useDeleteSavedScreen,
  useSavedScreens,
} from '@/hooks/api';
import { useToast } from '@/lib/toast-context';
import { SCREENER_INDUSTRIES, SCREENER_SECTORS } from '@/lib/screener-taxonomy';
import type { ScreenerFilters } from '@/lib/types';

interface ScreenerFiltersFormProps {
  onSearch: (filters: ScreenerFilters) => void;
  pending?: boolean;
  disabled?: boolean;
}

const SEARCH_MODES = [
  { label: 'By symbol', value: 'symbol' },
  { label: 'By filters', value: 'filters' },
];

const SECTOR_OPTIONS = SCREENER_SECTORS.map(s => ({ label: s, value: s }));
const INDUSTRY_OPTIONS = SCREENER_INDUSTRIES.map(i => ({ label: i, value: i }));

/** Toggles between a plain symbol/name lookup and fundamental-criteria filtering (market cap, dividend, sector, industry) — the two are mutually exclusive on the backend. */
export default function ScreenerFiltersForm({
  onSearch,
  pending,
  disabled,
}: ScreenerFiltersFormProps) {
  const [mode, setMode] = useState<'symbol' | 'filters'>('filters');
  const [symbol, setSymbol] = useState('');
  const [marketCapMin, setMarketCapMin] = useState<number | null>(null);
  const [marketCapMax, setMarketCapMax] = useState<number | null>(null);
  const [dividendMin, setDividendMin] = useState<number | null>(null);
  const [dividendMax, setDividendMax] = useState<number | null>(null);
  const [sector, setSector] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);

  const { data: savedScreens } = useSavedScreens();
  const { mutateAsync: createSavedScreen, isPending: savePending } =
    useCreateSavedScreen();
  const { mutateAsync: deleteSavedScreen } = useDeleteSavedScreen();
  const { show: showToast } = useToast();

  const [selectedSavedScreenId, setSelectedSavedScreenId] = useState<
    string | null
  >(null);
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [saveName, setSaveName] = useState('');

  function buildCurrentFilters(): ScreenerFilters {
    if (mode === 'symbol') {
      return symbol.trim() ? { symbol: symbol.trim() } : {};
    }
    return {
      marketCapMin: marketCapMin ?? undefined,
      marketCapMax: marketCapMax ?? undefined,
      dividendMin: dividendMin ?? undefined,
      dividendMax: dividendMax ?? undefined,
      sector: sector ?? undefined,
      industry: industry ?? undefined,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    if (mode === 'symbol') {
      if (!symbol.trim()) return;
      onSearch({ symbol: symbol.trim() });
      return;
    }
    onSearch(buildCurrentFilters());
  }

  function applyFilters(filters: ScreenerFilters) {
    if (filters.symbol) {
      setMode('symbol');
      setSymbol(filters.symbol);
    } else {
      setMode('filters');
      setMarketCapMin(filters.marketCapMin ?? null);
      setMarketCapMax(filters.marketCapMax ?? null);
      setDividendMin(filters.dividendMin ?? null);
      setDividendMax(filters.dividendMax ?? null);
      setSector(filters.sector ?? null);
      setIndustry(filters.industry ?? null);
    }
    onSearch(filters);
  }

  function handleApplySavedScreen(id: string | null) {
    setSelectedSavedScreenId(id);
    if (!id) return;
    const saved = (savedScreens ?? []).find(s => s.id === id);
    if (saved) applyFilters(saved.filters);
  }

  async function handleSaveCurrent() {
    const name = saveName.trim();
    if (!name) return;
    try {
      await createSavedScreen({ name, filters: buildCurrentFilters() });
      setSaveDialogVisible(false);
      setSaveName('');
    } catch {
      showToast({
        severity: 'error',
        summary: 'Could not save screen',
        detail: 'A saved screen with this name may already exist',
      });
    }
  }

  async function handleDeleteSavedScreen() {
    if (!selectedSavedScreenId) return;
    try {
      await deleteSavedScreen(selectedSavedScreenId);
      setSelectedSavedScreenId(null);
    } catch {
      showToast({
        severity: 'error',
        summary: 'Could not delete saved screen',
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <Dropdown
          value={selectedSavedScreenId}
          options={(savedScreens ?? []).map(s => ({
            label: s.name,
            value: s.id,
          }))}
          onChange={e => handleApplySavedScreen(e.value)}
          placeholder='Saved screens'
          showClear
          className='min-w-48'
          disabled={disabled}
        />
        {selectedSavedScreenId && (
          <Button
            type='button'
            icon='pi pi-trash'
            text
            severity='danger'
            aria-label='Delete saved screen'
            onClick={handleDeleteSavedScreen}
          />
        )}
        <Button
          type='button'
          label='Save current filters'
          icon='pi pi-bookmark'
          text
          disabled={disabled}
          onClick={() => setSaveDialogVisible(true)}
        />
      </div>

      <SelectButton
        value={mode}
        onChange={e => e.value && setMode(e.value)}
        options={SEARCH_MODES}
        className='self-start'
        disabled={disabled}
      />

      {mode === 'symbol' ? (
        <InputText
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          placeholder='Symbol or company name'
          className='w-full'
          disabled={disabled}
        />
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          <label className='flex flex-col gap-1 text-sm text-gray-600'>
            Market cap min
            <InputNumber
              value={marketCapMin}
              onValueChange={e => setMarketCapMin(e.value ?? null)}
              mode='decimal'
              min={0}
              placeholder='0'
              disabled={disabled}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm text-gray-600'>
            Market cap max
            <InputNumber
              value={marketCapMax}
              onValueChange={e => setMarketCapMax(e.value ?? null)}
              mode='decimal'
              min={0}
              placeholder='Any'
              disabled={disabled}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm text-gray-600'>
            Dividend min
            <InputNumber
              value={dividendMin}
              onValueChange={e => setDividendMin(e.value ?? null)}
              mode='decimal'
              minFractionDigits={2}
              min={0}
              placeholder='0'
              disabled={disabled}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm text-gray-600'>
            Dividend max
            <InputNumber
              value={dividendMax}
              onValueChange={e => setDividendMax(e.value ?? null)}
              mode='decimal'
              minFractionDigits={2}
              min={0}
              placeholder='Any'
              disabled={disabled}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm text-gray-600'>
            Sector
            <Dropdown
              value={sector}
              options={SECTOR_OPTIONS}
              onChange={e => setSector(e.value)}
              placeholder='Any sector'
              showClear
              filter
              disabled={disabled}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm text-gray-600'>
            Industry
            <Dropdown
              value={industry}
              options={INDUSTRY_OPTIONS}
              onChange={e => setIndustry(e.value)}
              placeholder='Any industry'
              showClear
              filter
              disabled={disabled}
            />
          </label>
        </div>
      )}

      <Button
        type='submit'
        label='Search'
        icon='pi pi-search'
        loading={pending}
        disabled={disabled}
        className='self-start'
      />

      <Dialog
        header='Save current filters'
        visible={saveDialogVisible}
        onHide={() => setSaveDialogVisible(false)}
        style={{ width: '24rem', maxWidth: '95vw' }}
      >
        <div className='flex items-center gap-2'>
          <InputText
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            placeholder='Screen name'
            className='flex-1'
          />
          <Button
            label='Save'
            disabled={!saveName.trim() || savePending}
            onClick={handleSaveCurrent}
          />
        </div>
      </Dialog>
    </form>
  );
}
