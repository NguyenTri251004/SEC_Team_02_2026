export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded shadow-sm border">Card 1</div>
        <div className="bg-white p-6 rounded shadow-sm border">Card 2</div>
        <div className="bg-white p-6 rounded shadow-sm border">Card 3</div>
      </div>
    </div>
  );
}