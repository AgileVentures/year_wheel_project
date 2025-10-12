function CreateWheelCard({ onClick, hasReachedLimit }) {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-gradient-to-br from-blue-50 to-indigo-50 
        border-2 border-dashed border-blue-300 
        rounded-sm p-5 
        flex flex-col items-center justify-center 
        transition-all
        ${hasReachedLimit 
          ? 'cursor-not-allowed opacity-60' 
          : 'hover:border-blue-400 hover:shadow-md cursor-pointer group'
        }
      `}
      style={{ minHeight: '280px' }}
    >
      <div className={`
        w-16 h-16 bg-blue-100 rounded-full 
        flex items-center justify-center mb-3 
        transition-colors
        ${!hasReachedLimit && 'group-hover:bg-blue-200'}
      `}>
        <span className="text-3xl text-blue-600">+</span>
      </div>
      <h3 className="font-semibold text-blue-900 mb-1">
        {hasReachedLimit ? 'Gräns nådd' : 'Skapa nytt årshjul'}
      </h3>
      <p className="text-sm text-blue-700 text-center px-4">
        {hasReachedLimit 
          ? 'Uppgradera till Premium för fler hjul'
          : 'Börja planera ditt år'
        }
      </p>
    </div>
  );
}

export default CreateWheelCard;
