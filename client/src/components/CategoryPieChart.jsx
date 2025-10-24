import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const CategoryPieChart = ({ data }) => {
  const chartData = {
    labels: data.map(item => item.category),
    datasets: [{
      label: '# of Grievances',
      data: data.map(item => item.count),
      backgroundColor: [
      '#4A90E2', // Blue
      '#50E3C2', // Teal
      '#F5A623', // Orange
      '#7ED321', // Green
      '#BD10E0', // Purple
    ],
    borderColor: ['rgba(255, 255, 255, 1)'],
    borderWidth: 2,
    }],
  };
  return (
    // 1. Wrap the Pie chart in a div with positioning and a set height.
    <div className="relative h-80 w-full"> 
      <Pie 
        data={chartData} 
        // 2. Add options to ensure responsiveness within the new container.
        options={{
          maintainAspectRatio: false,
          responsive: true,
        }}
      />
    </div>
  );
};

export default CategoryPieChart;