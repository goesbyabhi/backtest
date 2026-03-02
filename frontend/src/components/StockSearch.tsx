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
        control: (provided: any, state: any) => ({
            ...provided,
            backgroundColor: '#111',
            borderColor: state.isFocused ? 'var(--accent)' : 'var(--border)',
            color: 'white',
            width: '250px',
            minHeight: '30px',
            borderRadius: '0',
            boxShadow: 'none',
            fontSize: '12px',
            '&:hover': {
                borderColor: 'var(--accent)'
            }
        }),
        menu: (provided: any) => ({
            ...provided,
            backgroundColor: '#0a0a0a',
            border: '1px solid var(--border)',
            borderRadius: '0',
            color: 'white',
            marginTop: '0px'
        }),
        option: (provided: any, state: any) => ({
            ...provided,
            backgroundColor: state.isFocused ? '#222' : '#0a0a0a',
            color: state.isFocused ? 'var(--accent)' : 'var(--text-main)',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'monospace'
        }),
        singleValue: (provided: any) => ({
            ...provided,
            color: 'var(--accent)',
            fontFamily: 'monospace',
            fontWeight: 'bold'
        }),
        input: (provided: any) => ({
            ...provided,
            color: 'white',
            fontFamily: 'monospace'
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
