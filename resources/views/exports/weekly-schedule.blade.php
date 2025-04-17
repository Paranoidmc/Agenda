<table>
    <thead>
        <tr>
            <th>Nome</th>
            @foreach ($weekDays as $day)
                <th>{{ $day['day_name'] }}<br>{{ $day['day_number'] }} {{ $day['month'] }}</th>
            @endforeach
        </tr>
    </thead>
    <tbody>
        @foreach ($rows as $row)
            <tr>
                <td>{{ $row['label'] }}</td>
                @foreach ($row['days'] as $cell)
                    <td>
                        @foreach ($cell as $activity)
                            <div>
                                {{ $activity['activityType'] }} - {{ $activity['client'] }} - {{ $activity['site'] }} - {{ $activity['vehicle'] }} - {{ $activity['slot'] }}
                            </div>
                        @endforeach
                    </td>
                @endforeach
            </tr>
        @endforeach
    </tbody>
</table>
