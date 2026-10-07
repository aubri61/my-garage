import Link from "next/link";

export type ServiceActionTarget = { href: string; available: boolean };

type ServiceActionProps = {
  target: ServiceActionTarget;
  children: React.ReactNode;
  descriptionId: string;
};

// Enable a destination only after its route exists; disabled actions never navigate.
export function ServiceAction({ target, children, descriptionId }: ServiceActionProps) {
  const content = <>{children}<span aria-hidden="true">↗</span></>;
  return target.available
    ? <Link className="service-action" href={target.href}>{content}</Link>
    : <button className="service-action" type="button" disabled aria-describedby={descriptionId}>{content}</button>;
}
