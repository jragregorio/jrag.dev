import { ArrowUpRight, Check, Copy, Mail, Phone } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type ContactItem = {
  id: string;
  label: string;
  value: string;
  href: string;
  copyValue: string;
  icon: typeof Mail;
  continuation?: boolean;
};

const items: ContactItem[] = [
  {
    id: "email",
    label: "email",
    value: "jragregorio@gmail.com",
    href: "mailto:jragregorio@gmail.com",
    copyValue: "jragregorio@gmail.com",
    icon: Mail,
  },
  {
    id: "mobile-1",
    label: "mobile",
    value: "+63977 680 7421",
    href: "tel:+639776807421",
    copyValue: "+639776807421",
    icon: Phone,
  },
  {
    id: "mobile-2",
    label: "mobile",
    value: "+63976 053 8757",
    href: "tel:+639760538757",
    copyValue: "+639760538757",
    icon: Phone,
    continuation: true,
  },
];

function ContactRow({ item }: { item: ContactItem }) {
  const [copied, setCopied] = useState(false);
  const Icon = item.icon;

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(item.copyValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li
      className={cn("contact-row", item.continuation && "is-continuation")}
    >
      <Icon className="contact-row__icon" aria-hidden="true" />
      <span className="contact-row__label" aria-hidden={item.continuation || undefined}>
        {item.label}
      </span>
      <span className="contact-row__arrow" aria-hidden="true">
        →
      </span>
      <a className="contact-row__value" href={item.href}>
        {item.value}
        <ArrowUpRight className="contact-row__external" aria-hidden="true" />
      </a>
      <button
        type="button"
        className="contact-row__copy"
        onClick={copyValue}
        aria-label={copied ? `Copied ${item.value}` : `Copy ${item.value}`}
      >
        <Check
          className={cn("contact-row__copy-icon", copied && "is-visible")}
          aria-hidden="true"
        />
        <Copy
          className={cn("contact-row__copy-icon", !copied && "is-visible")}
          aria-hidden="true"
        />
      </button>
    </li>
  );
}

export function ContactList() {
  return (
    <ul className="contact__list">
      {items.map((item) => (
        <ContactRow key={item.id} item={item} />
      ))}
    </ul>
  );
}
