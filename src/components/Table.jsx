import React from 'react'

const Table = ({columns, renderRow, data}) => {
  return (
    <table className='w-full mt-4'>
        <thead>
        <tr className='text-left text-gray-500 text-sm'>
            {columns.map((column, index) => (
                <th key={column.accessor || index} className={column.className}>{column.header}</th>
            ))}
        </tr>
        </thead>
        <tbody>
            {data.map((item) => (
                <React.Fragment key={item.id}>
                    {renderRow(item)}
                </React.Fragment>
            ))}
        </tbody>
    </table>
  )
}

export default Table