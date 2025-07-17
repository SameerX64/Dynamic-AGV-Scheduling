import React from 'react';

export function TaskQueue({ logs }) {
  const recentTasks = logs.slice(0, 5);

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Recent Tasks</h3>
      <div className="space-y-2">
        {recentTasks.length === 0 ? (
          <p className="text-gray-500 text-sm">No tasks yet</p>
        ) : (
          recentTasks.map((task, index) => {
            const [agv, from, to, time] = task.split('-');
            return (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-blue-600">{agv}</span>
                  <span className="text-sm text-gray-600">{from} → {to}</span>
                </div>
                <span className="text-xs text-gray-500">{time}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
