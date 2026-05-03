import MapWrapper from '@/components/Map/MapWrapper';

export default function Home() {
  return (
    <main className="flex h-screen w-screen flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 z-10 shadow-sm flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Urbix <span className="text-blue-600 font-normal text-lg">Sunshine Coast</span>
        </h1>
        <div className="text-sm text-gray-500">
          Planning & Property Explorer
        </div>
      </header>

      <div className="flex-1 relative">
        <MapWrapper />

        {/* Overlay for Property List (Optional / Future) */}
        {/* <div className="absolute top-4 left-4 z-[1000] bg-white p-4 rounded-lg shadow-lg max-h-[80vh] overflow-y-auto w-80 hidden md:block">
           <h2 className="font-bold mb-2">Properties</h2>
           ...
        </div> */}
      </div>
    </main>
  );
}
