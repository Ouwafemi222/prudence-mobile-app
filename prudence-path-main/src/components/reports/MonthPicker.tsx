import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMonthYearLabel, listRecentMonthStarts } from "@/lib/nigeriaTime";

type MonthPickerProps = {
  value: string;
  onChange: (monthStartISO: string) => void;
  count?: number;
  className?: string;
};

export function MonthPicker({ value, onChange, count = 12, className }: MonthPickerProps) {
  const months = listRecentMonthStarts(count);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-full sm:w-56"}>
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent>
        {months.map((start) => (
          <SelectItem key={start} value={start}>
            {formatMonthYearLabel(start)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
