import { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

interface PoolFiltersProps {
  onFilter: (filters: { lotteryTypeId?: string; priceRange?: string }) => void;
}

const PoolFilters = ({ onFilter }: PoolFiltersProps) => {
  const [lotteryTypes, setLotteryTypes] = useState<Tables<'lottery_types'>[]>([]);
  const [lotteryTypeId, setLotteryTypeId] = useState<string>('');
  const [priceRange, setPriceRange] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    supabase.from('lottery_types').select('*').eq('active', true).order('name').then(({ data }) => {
      if (data) setLotteryTypes(data);
    });
  }, []);

  const applyFilters = (lt?: string, pr?: string) => {
    onFilter({
      lotteryTypeId: (lt ?? lotteryTypeId) || undefined,
      priceRange: (pr ?? priceRange) || undefined,
    });
  };

  const clearFilters = () => {
    setLotteryTypeId('');
    setPriceRange('');
    onFilter({});
  };

  const hasFilters = lotteryTypeId || priceRange;

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-1.5 h-3 w-3" />
          Filtrar
          {hasFilters && <span className="ml-1.5 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">!</span>}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground" onClick={clearFilters}>
            <X className="mr-1 h-3 w-3" /> Limpar
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-card p-3">
          <Select value={lotteryTypeId} onValueChange={(v) => { setLotteryTypeId(v); applyFilters(v, undefined); }}>
            <SelectTrigger className="w-[160px] bg-muted h-8 text-xs">
              <SelectValue placeholder="Modalidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {lotteryTypes.map((lt) => (
                <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priceRange} onValueChange={(v) => { setPriceRange(v); applyFilters(undefined, v); }}>
            <SelectTrigger className="w-[160px] bg-muted h-8 text-xs">
              <SelectValue placeholder="Faixa de preço" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os preços</SelectItem>
              <SelectItem value="0-10">Até R$ 10</SelectItem>
              <SelectItem value="10-25">R$ 10 - R$ 25</SelectItem>
              <SelectItem value="25-50">R$ 25 - R$ 50</SelectItem>
              <SelectItem value="50+">Acima de R$ 50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default PoolFilters;
