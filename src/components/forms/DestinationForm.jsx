'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiMapPin, FiGlobe, FiHash, FiMail } from 'react-icons/fi';

const destinationSchema = z.object({
  city: z.string().min(1, 'City name is required'),
  country: z.string().min(1, 'Country is required'),
  postalCode: z.string().optional().nullable(),
  km: z.string().transform(val => (val ? parseInt(val) : null)).optional().nullable(),
});

export default function DestinationForm({ onSubmit, onClose, initialData }) {
  const {
    register,
    handleSubmit: hookFormSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(destinationSchema),
    defaultValues: {
      city: initialData?.city || '',
      country: initialData?.country || '',
      postalCode: initialData?.postalCode || '',
      km: initialData?.km?.toString() || '',
    },
  });

  const handleSubmit = async (data) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const inputClasses = "mt-1 block w-full rounded-lg border-0 py-2 px-3 bg-gray-50 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6";
  const labelClasses = "block text-sm font-medium leading-6 text-gray-900";
  const iconClasses = "absolute left-3 top-[34px] text-gray-400 text-lg";
  const inputWithIconClasses = "pl-10 " + inputClasses;
  const groupClasses = "relative";
  const errorClasses = "mt-1 text-sm text-red-600";

  return (
    <form onSubmit={hookFormSubmit(handleSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* City Name */}
        <div className={groupClasses}>
          <label className={labelClasses}>City Name</label>
          <FiMapPin className={iconClasses} />
          <input
            type="text"
            placeholder="Enter city name"
            {...register('city')}
            className={inputWithIconClasses}
          />
          {errors.city && (
            <p className={errorClasses}>{errors.city.message}</p>
          )}
        </div>

        {/* Country */}
        <div className={groupClasses}>
          <label className={labelClasses}>Country</label>
          <FiGlobe className={iconClasses} />
          <input
            type="text"
            placeholder="Enter country"
            {...register('country')}
            className={inputWithIconClasses}
          />
          {errors.country && (
            <p className={errorClasses}>{errors.country.message}</p>
          )}
        </div>

        {/* Postal Code */}
        <div className={groupClasses}>
          <label className={labelClasses}>Postal Code</label>
          <FiMail className={iconClasses} />
          <input
            type="text"
            placeholder="Enter postal code"
            {...register('postalCode')}
            className={inputWithIconClasses}
          />
          {errors.postalCode && (
            <p className={errorClasses}>{errors.postalCode.message}</p>
          )}
        </div>

        {/* Distance (KM) */}
        <div className={groupClasses}>
          <label className={labelClasses}>Distance (KM)</label>
          <FiHash className={iconClasses} />
          <input
            type="number"
            placeholder="Enter distance in kilometers"
            {...register('km')}
            className={inputWithIconClasses}
          />
          {errors.km && (
            <p className={errorClasses}>{errors.km.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Destination'}
        </button>
      </div>
    </form>
  );
} 