import React from 'react';
import { Handle, Position } from 'reactflow';

export function AGVNode({ data }) {
  const { label = '', status = 'idle', battery = 100, animate = false } = data;

  const getStatusColor = () => {
    if (status === 'moving') return 'border-blue-500 bg-blue-100';
    if (status === 'charging') return 'border-yellow-500 bg-yellow-100';
    if (status === 'idle') return 'border-gray-400 bg-gray-100';
    return 'border-green-500 bg-green-100';
  };

  const getBatteryColor = () => {
    if (battery > 70) return 'bg-green-500';
    if (battery > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const animationClass = animate ? 'animate-pulse' : '';

  return (
    <div className="relative">
      <div className={`relative group ${animationClass}`}>
        <Handle type="target" position={Position.Top} className="!bg-gray-400" />
        <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 
          ${getStatusColor()} transition-all duration-300 hover:shadow-lg`}>
          <span className="text-lg font-bold text-gray-700">{label}</span>
          <div className="text-xs text-gray-500">{status}</div>

          {/* Battery Indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full p-0.5 bg-white shadow-sm">
            <div
              className={`w-full h-full rounded-full ${getBatteryColor()} transition-transform duration-300`}
              style={{ transform: `scale(${battery / 100})` }}
            />
          </div>

          {/* Status Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
            hidden group-hover:block bg-white p-2 rounded shadow-lg text-xs w-32">
            <div className="font-semibold mb-1">{label}</div>
            <div className="text-gray-600">Status: {status}</div>
            <div className="text-gray-600">Battery: {battery}%</div>
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      </div>
    </div>
  );
}

export function LocationNode({ data }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
      <Handle type="target" position={Position.Top} className="w-16 !bg-teal-500" />
      <div className="flex">
        <div className="rounded-full w-12 h-12 flex items-center justify-center bg-gray-100">
          📍
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold">{data.label}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-16 !bg-teal-500" />
    </div>
  );
}
