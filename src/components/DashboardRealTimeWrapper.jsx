"use client";

import React from 'react';
import RealTimeHandler from '@/components/RealTimeHandler';

// Bu wrapper client component olduğundan, server component'a güvenli bir şekilde dahil edilebilir
const DashboardRealTimeWrapper = ({ children }) => {
  return (
    <>
      <RealTimeHandler />
      {children}
    </>
  );
};

export default DashboardRealTimeWrapper; 