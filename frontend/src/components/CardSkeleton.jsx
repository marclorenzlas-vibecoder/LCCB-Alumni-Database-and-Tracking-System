import React from 'react';

const CardSkeleton = ({ count = 3, className = "" }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`app-card overflow-hidden flex flex-col p-0 h-full animate-pulse ${className}`}>
          {/* Image placeholder */}
          <div className="h-48 w-full bg-slate-200"></div>
          
          <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
            {/* Meta tags placeholder */}
            <div className="mb-3 flex items-center justify-between">
              <div className="h-4 w-1/3 bg-slate-200 rounded-full"></div>
              <div className="h-4 w-1/4 bg-slate-200 rounded-full"></div>
            </div>

            {/* Title placeholder */}
            <div className="h-6 w-3/4 bg-slate-200 rounded-md mb-4"></div>
            
            {/* Description lines placeholder */}
            <div className="space-y-2 mb-6">
              <div className="h-4 w-full bg-slate-200 rounded-md"></div>
              <div className="h-4 w-full bg-slate-200 rounded-md"></div>
              <div className="h-4 w-2/3 bg-slate-200 rounded-md"></div>
            </div>

            {/* Footer buttons placeholder */}
            <div className="mt-auto flex gap-2">
              <div className="h-10 w-full bg-slate-200 rounded-md"></div>
              <div className="h-10 w-full bg-slate-200 rounded-md"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default CardSkeleton;
