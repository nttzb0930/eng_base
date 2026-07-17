type HeaderProps = {
  title: string;
};

export const Header = ({ title }: HeaderProps) => {
  return (
    <div className="mb-5 flex items-center justify-between border-b-2 bg-white pb-3 text-neutral-800">
      <h1 className="text-lg font-bold">{title}</h1>
    </div>
  );
};
