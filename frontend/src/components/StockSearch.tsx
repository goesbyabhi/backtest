import { AsyncPaginate } from 'react-select-async-paginate';

interface StockSearchProps {
    value: { value: string, label: string } | null;
    onChange: (val: any) => void;
}

export const StockSearch = ({ value, onChange }: StockSearchProps) => {

    const loadOptions = async (searchQuery: string, _loadedOptions: any, { page }: any) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/search?q=${searchQuery}`);
            const data = await response.json();

            return {
                options: data.map((item: any) => ({
                    value: item.symbol,
                    label: `${item.symbol} - ${item.name}`
                })),
                hasMore: false,
                additional: {
                    page: page + 1,
                },
            };
        } catch (err) {
            console.error("Error fetching symbols:", err);
            return { options: [], hasMore: false };
        }
    };

    const customStyles = {
        control: (provided: any) => ({
            ...provided,
            backgroundColor: '#2a2a2a',
            borderColor: '#333',
            color: 'white',
            width: '250px',
            minHeight: '34px',
        }),
        menu: (provided: any) => ({
            ...provided,
            backgroundColor: '#2a2a2a',
            color: 'white',
        }),
        option: (provided: any, state: any) => ({
            ...provided,
            backgroundColor: state.isFocused ? '#3d3d3d' : '#2a2a2a',
            color: 'white',
            cursor: 'pointer',
        }),
        singleValue: (provided: any) => ({
            ...provided,
            color: 'white',
        }),
        input: (provided: any) => ({
            ...provided,
            color: 'white',
        })
    };

    return (
        <AsyncPaginate
            value={value}
            loadOptions={loadOptions}
            onChange={onChange}
            additional={{ page: 1 }}
            styles={customStyles}
            placeholder="Search NSE/BSE stocks..."
            debounceTimeout={300}
        />
    );
};
