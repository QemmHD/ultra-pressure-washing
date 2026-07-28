import Breadcrumbs from "./Breadcrumbs";

export default function PageIntro({
  eyebrow,
  title,
  description,
  breadcrumb = title,
}: {
  eyebrow: string;
  title: string;
  description: string;
  breadcrumb?: string;
}) {
  return (
    <header className="mx-auto max-w-4xl text-center">
      <Breadcrumbs current={breadcrumb} />
      <p className="font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-6xl dark:text-white">
        {title}
      </h1>
      <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </header>
  );
}
