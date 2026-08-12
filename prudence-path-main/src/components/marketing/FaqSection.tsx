import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FaqItem } from "@/lib/marketingFaq";

type FaqSectionProps = {
  items: FaqItem[];
  /** Show only first N items on homepage; full list on /faq */
  limit?: number;
};

export function FaqSection({ items, limit }: FaqSectionProps) {
  const visible = limit ? items.slice(0, limit) : items;

  return (
    <Accordion type="single" collapsible className="w-full">
      {visible.map((item, i) => (
        <AccordionItem key={item.question} value={`faq-${i}`}>
          <AccordionTrigger className="text-left text-base">{item.question}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
