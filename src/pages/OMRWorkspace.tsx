import React, { useState, useRef, useEffect } from 'react';
import { Camera, Settings, Users, FileText, BarChart2, CheckSquare, RotateCcw, Volume2, Upload, Download, Printer } from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function OMRWorkspace() {
  const [activeTab, setActiveTab] = useState<'scan' | 'config' | 'students' | 'print' | 'results'>('scan');
  
  // State quản lý
  const [examConfig, setExamConfig] = useState({
    partI_count: 12,
    partII_count: 4,
    partIII_count: 6
  });
  const [students, setStudents] = useState<{sbd: string, name: string, class: string}[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const tabs = [
    { id: 'scan', label: 'Chấm bài', icon: Camera },
    { id: 'config', label: 'Đáp án', icon: Settings },
    { id: 'students', label: 'Thí sinh', icon: Users },
    { id: 'print', label: 'Phiếu in', icon: FileText },
    { id: 'results', label: 'Kết quả', icon: BarChart2 },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-slate-400 font-medium">EDUPLANAI MARK v2025.1</div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'scan' && <ScannerTab onSaveSubmission={(s) => setSubmissions(prev => [...prev, s])} />}
        {activeTab === 'config' && <ConfigTab config={examConfig} setConfig={setExamConfig} />}
        {activeTab === 'students' && <StudentsTab students={students} setStudents={setStudents} />}
        {activeTab === 'print' && <TemplatesTab />}
        {activeTab === 'results' && <ResultsTab submissions={submissions} students={students} />}
      </div>
    </div>
  );
}

// TAB 1: SCANNER
function ScannerTab({ onSaveSubmission }: { onSaveSubmission: (s: any) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isScanning) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(console.error);
    }
  }, [isScanning]);

  const playBeep = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    osc.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  };

  const simulateScan = () => {
    playBeep();
    onSaveSubmission({ sbd: '001', score: 8.5, time: new Date().toLocaleTimeString() });
    alert("Đã chấm bài SBD 001: 8.5 điểm");
  };

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      <div className="flex gap-4 mb-2">
        <label className="flex items-center gap-2"><input type="checkbox" /> Hiện kết quả</label>
        <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Chấm liên tiếp</label>
        <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Âm báo</label>
      </div>
      <div className="relative flex-1 bg-black rounded-xl overflow-hidden border-4 border-emerald-500">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 border-[40px] border-emerald-500/30 flex items-center justify-center pointer-events-none">
          <div className="w-full h-full border-2 border-white/50" />
        </div>
      </div>
      <button onClick={() => setIsScanning(!isScanning)} className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold">
        {isScanning ? 'Dừng Camera' : 'Bật Camera'}
      </button>
      <button onClick={simulateScan} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold">Mô phỏng quét phiếu</button>
    </div>
  );
}

// TAB 2: CONFIG
function ConfigTab({ config, setConfig }: any) {
  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-sm border">
      <h2 className="text-xl font-bold mb-6">Cấu hình đề thi chuẩn 2025</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Phần I: Trắc nghiệm (4 lựa chọn)</label>
          <input type="number" defaultValue={config.partI_count} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Phần II: Đúng/Sai (Lũy tiến điểm)</label>
          <input type="number" defaultValue={config.partII_count} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Phần III: Trả lời ngắn (Điền số)</label>
          <input type="number" defaultValue={config.partIII_count} className="w-full p-2 border rounded" />
        </div>
        <button className="w-full bg-emerald-600 text-white p-2 rounded mt-4">Lưu cấu hình</button>
      </div>
    </div>
  );
}

// TAB 3: STUDENTS
function StudentsTab({ students, setStudents }: any) {
  const handleImport = (e: any) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = data.Sheets[data.SheetNames[0]];
      setStudents(XLSX.utils.sheet_to_json(ws));
    };
    reader.readAsBinaryString(file);
  };
  return (
    <div className="p-6">
      <input type="file" onChange={handleImport} className="mb-4" />
      <table className="w-full text-sm text-left border rounded-lg">
        <thead className="bg-slate-100"><tr><th className="p-2">SBD</th><th className="p-2">Họ tên</th><th className="p-2">Lớp</th></tr></thead>
        <tbody>
          {students.map((s: any, i: number) => <tr key={i} className="border-t"><td>{s.SBD}</td><td>{s.Name}</td><td>{s.Class}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

// TAB 4: TEMPLATES
function TemplatesTab() {
  return (
    <div className="p-6 grid grid-cols-3 gap-6">
      {['Phiếu BGD 2025', 'Phiếu 12-4-6', 'Phiếu TNMaker'].map(t => (
        <div key={t} className="p-4 border rounded-xl bg-white shadow-sm hover:border-emerald-500">
          <div className="h-40 bg-slate-200 mb-2 rounded" />
          <h3 className="font-bold">{t}</h3>
          <button className="text-emerald-600 text-sm mt-2 flex items-center gap-1"><Download size={14}/> Tải PDF</button>
        </div>
      ))}
    </div>
  );
}

// TAB 5: RESULTS
function ResultsTab({ submissions, students }: any) {
  const data = submissions.map(s => ({ ...s, name: students.find(st => st.SBD === s.sbd)?.name || 'Unknown' }));
  return (
    <div className="p-6">
      <div className="h-64 mb-6 bg-white p-4 rounded-xl border">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="sbd" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="score" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="w-full text-sm bg-white border rounded-lg">
        <thead className="bg-slate-100"><tr><th className="p-2">SBD</th><th className="p-2">Họ tên</th><th className="p-2">Điểm</th></tr></thead>
        <tbody>{data.map((s,i) => <tr key={i} className="border-t"><td>{s.sbd}</td><td>{s.name}</td><td>{s.score}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
