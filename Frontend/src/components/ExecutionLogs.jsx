import React, { useRef, useEffect } from 'react';

export function ExecutionLogs({ logs }) {
  const logsEndRef = useRef(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const getStatusColor = (log) => {
    if (log.includes('completed')) return 'text-green-600';
    if (log.includes('started')) return 'text-blue-600';
    if (log.includes('charging')) return 'text-yellow-600';
    if (log.includes('error') || log.includes('collision')) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusIcon = (log) => {
    if (log.includes('completed')) {
      return '✅';
    } else if (log.includes('started')) {
      return '▶️';
    } else if (log.includes('charging')) {
      return '🔋';
    } else if (log.includes('error') || log.includes('collision')) {
      return '⚠️';
    }
    return '📝';
  };

  const formatLogEntry = (log) => {
    const [agv, from, to, time] = log.split('-');
    return {
      agv: agv.toUpperCase(),
      from,
      to,
      time,
      type: log.includes('charging') ? 'charging' :
        log.includes('completed') ? 'completed' :
          log.includes('started') ? 'started' :
            'info'
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Execution Logs
      </h2>
      <div className="space-y-2 h-[300px] overflow-y-auto">
        {logs.map((log, index) => {
          const entry = formatLogEntry(log);
          return (
            <div
              key={index}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center space-x-3"
            >
              <span className="text-lg" role="img" aria-label="status">
                {getStatusIcon(log)}
              </span>
              <div className="flex-1">
                <span className="font-semibold text-gray-800">{entry.agv}</span>
                {entry.from && entry.to && (
                  <span className="text-gray-600">
                    {' '}- Node {entry.from} → {entry.to}
                  </span>
                )}
                <span className="text-gray-400 text-sm ml-2">
                  {entry.time}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
