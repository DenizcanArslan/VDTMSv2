import React from 'react'

const InputField = ({label, type, register, name, error, inputProps}) => {
  return (
    <div className="flex flex-col gap-2 w-full md:w-[calc(33.33%-1rem)]">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        {...register(name)}
        {...inputProps}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm text-gray-900"
      />
      {error?.message && (
        <p className="text-red-600 text-xs">{error.message.toString()}</p>
      )}
    </div>
  )
}

export default InputField